//! The full `optimize` pipeline: prepare → candidates → fit → optimize →
//! baseline → report.

use crate::baseline::cheapest_assignment;
use crate::candidates::{custom_candidates, stock_candidates, CandidateBox};
use crate::clock::now_ms;
use crate::config::*;
use crate::cost::{evaluate, volume_in3, CostEval};
use crate::optimizer::{optimize_curve, CostMatrix, Solution};
use crate::packer::{FitCache, Placed};
use crate::prep::{prepare, Prepared, Signature};
use crate::types::*;

/// Id offset for current boxes in the fit cache.
const CURRENT_ID_OFFSET: u32 = 1_000_000;

/// Check settings and basic input; return a readable error.
pub fn check_input(input: &OptimizeInput) -> Result<(), String> {
    let s = &input.settings;
    if !(MIN_K..=MAX_K).contains(&s.k) {
        return Err(format!("k must be between {MIN_K} and {MAX_K}"));
    }
    if !s.padding_in.is_finite() || !(MIN_PADDING_IN..=MAX_PADDING_IN).contains(&s.padding_in) {
        return Err(format!(
            "padding_in must be between {MIN_PADDING_IN} and {MAX_PADDING_IN}"
        ));
    }
    let r = &s.rate_table;
    if !(r.base_usd.is_finite() && r.base_usd >= 0.0)
        || !(r.per_lb_usd.is_finite() && r.per_lb_usd >= 0.0)
        || !(r.max_lb.is_finite() && r.max_lb >= 1.0)
    {
        return Err("rate_table values must be non-negative numbers (max_lb ≥ 1)".into());
    }
    if input.products.is_empty() {
        return Err("no products".into());
    }
    if input.orders.is_empty() {
        return Err("no orders".into());
    }
    for b in &input.current_boxes {
        let d = [b.length_in, b.width_in, b.height_in, b.unit_cost_usd];
        if d.iter().any(|v| !v.is_finite()) || d[..3].iter().any(|&v| v <= 0.0) || d[3] < 0.0 {
            return Err(format!(
                "current box '{}' has invalid dimensions or cost",
                b.box_id
            ));
        }
    }
    Ok(())
}

/// Everything computed before the report is assembled (also used by
/// `validate`).
pub struct Model {
    pub prepared: Prepared,
    pub candidates: Vec<CandidateBox>,
    pub current: Vec<CandidateBox>,
    /// signatures × candidates.
    pub cand_matrix: CostMatrix,
    /// signatures × current boxes.
    pub cur_matrix: CostMatrix,
    /// Rows (signatures) that fit at least one candidate.
    pub servable: Vec<usize>,
    pub cache: FitCache,
    pub timings: Timings,
}

/// Progress callback: receives a short stage text ("Checking fits…").
pub type Progress<'a> = &'a mut dyn FnMut(&str);

/// Run pre-processing, candidate generation and the fit/cost matrices.
pub fn build_model(input: &OptimizeInput, progress: Progress) -> Result<Model, String> {
    check_input(input)?;
    let s = &input.settings;
    let mut timings = Timings::default();

    progress("Deduplicating orders…");
    let t0 = now_ms();
    let prepared = prepare(input);
    if prepared.signatures.is_empty() && prepared.too_large.is_empty() {
        return Err("no usable orders (check SKUs and quantities)".into());
    }
    let t1 = now_ms();
    timings.preprocess_ms = t1 - t0;

    progress(match s.mode {
        Mode::Stock => "Loading stock box catalog…",
        Mode::Custom => "Designing custom box sizes…",
    });
    let mut candidates = match s.mode {
        Mode::Stock => stock_candidates(),
        Mode::Custom => custom_candidates(&prepared.signatures, s.padding_in),
    };
    let current: Vec<CandidateBox> = input
        .current_boxes
        .iter()
        .map(CandidateBox::from_current)
        .collect();
    if s.allow_current_boxes {
        candidates.extend(current.iter().cloned());
    }
    let t2 = now_ms();
    timings.candidates_ms = t2 - t1;

    progress("Checking fits…");
    let mut cache = FitCache::new();
    let weights: Vec<f64> = prepared
        .signatures
        .iter()
        .map(|g| f64::from(g.count))
        .collect();
    let n = prepared.signatures.len();
    let mut cand_matrix = CostMatrix::new(n, candidates.len(), weights.clone());
    let mut cur_matrix = CostMatrix::new(n, current.len(), weights);
    for (r, sig) in prepared.signatures.iter().enumerate() {
        for (c, b) in candidates.iter().enumerate() {
            if let Some(e) = fit_eval(&mut cache, sig, b, c as u32, s) {
                cand_matrix.set(r, c, e.total_usd);
            }
        }
        for (c, b) in current.iter().enumerate() {
            let id = CURRENT_ID_OFFSET + c as u32;
            if let Some(e) = fit_eval(&mut cache, sig, b, id, s) {
                cur_matrix.set(r, c, e.total_usd);
            }
        }
    }
    let servable: Vec<usize> = (0..n).filter(|&r| cand_matrix.servable(r)).collect();
    timings.fit_ms = now_ms() - t2;

    Ok(Model {
        prepared,
        candidates,
        current,
        cand_matrix,
        cur_matrix,
        servable,
        cache,
        timings,
    })
}

/// Fit check (cached) + cost evaluation of one signature in one box.
fn fit_eval(
    cache: &mut FitCache,
    sig: &Signature,
    b: &CandidateBox,
    box_key: u32,
    s: &Settings,
) -> Option<CostEval> {
    cache.get_or_compute(sig.id, box_key, &sig.item_dims, b.dims, s.padding_in)?;
    Some(eval(sig, b, s))
}

fn eval(sig: &Signature, b: &CandidateBox, s: &Settings) -> CostEval {
    evaluate(
        sig.volume_in3,
        sig.weight_lb,
        b.dims,
        b.unit_cost,
        s.carrier,
        &s.rate_table,
    )
}

/// Run the whole optimization and build the report.
pub fn run_optimize(input: &OptimizeInput) -> Result<Report, String> {
    run_optimize_with_progress(input, &mut |_| {})
}

/// [`run_optimize`] with stage updates.
pub fn run_optimize_with_progress(
    input: &OptimizeInput,
    progress: Progress,
) -> Result<Report, String> {
    let start = now_ms();
    let mut model = build_model(input, progress)?;
    progress("Optimizing…");

    let t_opt = now_ms();
    let curve_solutions = optimize_curve(&model.cand_matrix, &model.servable, MAX_K as usize);
    model.timings.optimize_ms = now_ms() - t_opt;

    progress("Building report…");
    let t_rep = now_ms();
    let mut report = build_report(input, &mut model, &curve_solutions);
    model.timings.report_ms = now_ms() - t_rep;
    model.timings.total_ms = now_ms() - start;
    report.timings_ms = model.timings.clone();
    Ok(report)
}

#[derive(Default)]
struct Acc {
    orders: f64,
    shipping: f64,
    boxes: f64,
    item_vol: f64,
    interior: f64,
    cardboard: f64,
}

impl Acc {
    fn add(&mut self, w: f64, sig: &Signature, e: &CostEval) {
        self.orders += w;
        self.shipping += w * e.shipping_usd;
        self.boxes += w * e.box_usd;
        self.item_vol += w * sig.volume_in3;
        self.interior += w * e.interior_in3;
        self.cardboard += w * e.cardboard_lb;
    }

    fn totals(&self, factor: f64) -> Totals {
        Totals {
            orders: self.orders * factor,
            shipping_usd: self.shipping * factor,
            box_usd: self.boxes * factor,
            total_usd: (self.shipping + self.boxes) * factor,
            empty_space_pct: if self.interior > 0.0 {
                (1.0 - self.item_vol / self.interior) * 100.0
            } else {
                0.0
            },
            cardboard_lb: self.cardboard * factor,
            shipped_ft3: self.interior / 1728.0 * factor,
        }
    }
}

fn box_usage(b: &CandidateBox, orders: f64, served: f64) -> BoxUsage {
    BoxUsage {
        box_id: b.box_id.clone(),
        length_in: b.dims[0],
        width_in: b.dims[1],
        height_in: b.dims[2],
        unit_cost_usd: b.unit_cost,
        source: b.source,
        orders,
        orders_pct: if served > 0.0 {
            orders / served * 100.0
        } else {
            0.0
        },
    }
}

fn packed_box(
    cache: &mut FitCache,
    sig: &Signature,
    b: &CandidateBox,
    box_key: u32,
    prepared: &Prepared,
    padding: f64,
) -> Option<PackedBox> {
    let placed: Vec<Placed> = cache
        .get_or_compute(sig.id, box_key, &sig.item_dims, b.dims, padding)?
        .to_vec();
    Some(PackedBox {
        box_id: b.box_id.clone(),
        length_in: b.dims[0],
        width_in: b.dims[1],
        height_in: b.dims[2],
        items: placed
            .iter()
            .map(|p| Placement {
                sku: prepared.products[sig.item_products[p.item]].sku.clone(),
                x: p.pos[0] + padding,
                y: p.pos[1] + padding,
                z: p.pos[2] + padding,
                l: p.size[0],
                w: p.size[1],
                h: p.size[2],
            })
            .collect(),
    })
}

fn build_report(input: &OptimizeInput, model: &mut Model, curve: &[Solution]) -> Report {
    let s = &input.settings;
    let prepared = &model.prepared;
    let factor = prepared.annualization.factor;
    let sigs = &prepared.signatures;
    let m = &model.cand_matrix;

    // K-curve.
    let curve_points: Vec<CurvePoint> = curve
        .iter()
        .enumerate()
        .map(|(i, sol)| {
            let assign = cheapest_assignment(m, &sol.selected);
            let mut acc = Acc::default();
            let mut unserved = 0.0;
            for &r in &model.servable {
                let w = m.weight[r];
                match assign[r] {
                    Some(c) => acc.add(w, &sigs[r], &eval(&sigs[r], &model.candidates[c], s)),
                    None => unserved += w,
                }
            }
            let t = acc.totals(factor);
            CurvePoint {
                k: (i + 1) as u32,
                total_usd: t.total_usd,
                empty_space_pct: t.empty_space_pct,
                orders_unserved: unserved * factor,
                box_ids: sol
                    .selected
                    .iter()
                    .map(|&c| model.candidates[c].box_id.clone())
                    .collect(),
            }
        })
        .collect();

    // Chosen K.
    let chosen: Vec<usize> = curve
        .get((s.k as usize).min(curve.len()).saturating_sub(1))
        .map(|sol| sol.selected.clone())
        .unwrap_or_default();
    let opt_assign = cheapest_assignment(m, &chosen);
    let all_current: Vec<usize> = (0..model.current.len()).collect();
    let base_assign = cheapest_assignment(&model.cur_matrix, &all_current);

    // Totals and per-box usage.
    let mut base_common = Acc::default();
    let mut opt_common = Acc::default();
    let mut base_served = 0.0;
    let mut opt_served = 0.0;
    let mut opt_box_orders = vec![0.0; model.candidates.len()];
    let mut cur_box_orders = vec![0.0; model.current.len()];
    let mut assignments = Vec::with_capacity(sigs.len());
    let mut flagged = Vec::new();

    for (r, sig) in sigs.iter().enumerate() {
        let w = f64::from(sig.count);
        let b_eval = base_assign[r].map(|c| (c, eval(sig, &model.current[c], s)));
        let o_eval = opt_assign[r].map(|c| (c, eval(sig, &model.candidates[c], s)));
        if let Some((c, _)) = b_eval {
            base_served += w;
            cur_box_orders[c] += w;
        }
        if let Some((c, _)) = o_eval {
            opt_served += w;
            opt_box_orders[c] += w;
        }
        if let (Some((_, be)), Some((_, oe))) = (&b_eval, &o_eval) {
            base_common.add(w, sig, be);
            opt_common.add(w, sig, oe);
        }
        let items = prepared.items_of(&sig.lines);
        if !m.servable(r) {
            flagged.push(Flagged {
                signature_id: Some(sig.id),
                order_ids: sig.order_ids.clone(),
                items: items.clone(),
                count: sig.count,
                reason: FlagReason::FitsNoCandidate,
            });
        }
        if b_eval.is_none() {
            flagged.push(Flagged {
                signature_id: Some(sig.id),
                order_ids: sig.order_ids.clone(),
                items: items.clone(),
                count: sig.count,
                reason: FlagReason::FitsNoCurrentBox,
            });
        }
        assignments.push(Assignment {
            signature_id: sig.id,
            items,
            count: sig.count,
            item_volume_in3: sig.volume_in3,
            item_weight_lb: sig.weight_lb,
            baseline: b_eval.map(|(c, e)| e.to_metrics(&model.current[c].box_id)),
            optimized: o_eval.map(|(c, e)| e.to_metrics(&model.candidates[c].box_id)),
        });
    }
    for t in &prepared.too_large {
        flagged.push(Flagged {
            signature_id: None,
            order_ids: t.order_ids.clone(),
            items: prepared.items_of(&t.lines),
            count: t.count,
            reason: FlagReason::TooManyItems,
        });
    }

    let used = f64::from(prepared.orders_used);
    let baseline = base_common.totals(factor);
    let optimized = opt_common.totals(factor);
    let savings = baseline.total_usd - optimized.total_usd;
    let summary = Summary {
        savings_usd: savings,
        savings_pct: if baseline.total_usd > 0.0 {
            savings / baseline.total_usd * 100.0
        } else {
            0.0
        },
        cardboard_saved_lb: baseline.cardboard_lb - optimized.cardboard_lb,
        shipped_ft3_saved: baseline.shipped_ft3 - optimized.shipped_ft3,
        baseline_orders_served: base_served * factor,
        baseline_orders_flagged: (used - base_served) * factor,
        optimized_orders_served: opt_served * factor,
        optimized_orders_flagged: (used - opt_served) * factor,
        baseline,
        optimized,
    };

    // Recommended boxes, smallest first.
    let mut chosen_sorted = chosen.clone();
    chosen_sorted.sort_by(|&a, &b| {
        volume_in3(model.candidates[a].dims)
            .total_cmp(&volume_in3(model.candidates[b].dims))
            .then(a.cmp(&b))
    });
    let recommended: Vec<BoxUsage> = chosen_sorted
        .iter()
        .map(|&c| {
            box_usage(
                &model.candidates[c],
                opt_box_orders[c] * factor,
                opt_served * factor,
            )
        })
        .collect();
    let current: Vec<BoxUsage> = model
        .current
        .iter()
        .enumerate()
        .map(|(c, b)| box_usage(b, cur_box_orders[c] * factor, base_served * factor))
        .collect();

    // 3D placements for the most frequent signatures.
    let mut placements = Vec::new();
    for (r, sig) in sigs.iter().enumerate().take(PLACEMENTS_TOP_N) {
        let baseline = base_assign[r].and_then(|c| {
            packed_box(
                &mut model.cache,
                sig,
                &model.current[c],
                CURRENT_ID_OFFSET + c as u32,
                prepared,
                s.padding_in,
            )
        });
        let optimized = opt_assign[r].and_then(|c| {
            packed_box(
                &mut model.cache,
                sig,
                &model.candidates[c],
                c as u32,
                prepared,
                s.padding_in,
            )
        });
        placements.push(SignaturePlacements {
            signature_id: sig.id,
            baseline,
            optimized,
        });
    }

    Report {
        engine_version: env!("CARGO_PKG_VERSION").to_string(),
        settings: s.clone(),
        annualization: prepared.annualization.clone(),
        stats: InputStats {
            line_items: prepared.line_items,
            orders_total: prepared.orders_total,
            orders_used: prepared.orders_used,
            signatures: sigs.len() as u32,
            orders_too_large: prepared.orders_too_large,
            line_items_skipped: prepared.line_items_skipped,
            candidates: model.candidates.len() as u32,
        },
        summary,
        curve: curve_points,
        recommended,
        current,
        assignments,
        placements,
        flagged,
        timings_ms: Timings::default(),
    }
}
