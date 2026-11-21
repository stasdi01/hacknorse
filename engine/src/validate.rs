//! Validation: brute force vs. greedy + local search on a reduced instance.
//!
//! The reduced instance keeps the 25 most relevant candidates: the boxes in
//! the heuristic's solutions for K = 1..3, then the candidates that are the
//! cheapest fitting box for the most orders ("usage"), then the best single
//! boxes. For K = 2 and 3 every combination is tried.

use crate::clock::now_ms;
use crate::config::{VALIDATE_KS, VALIDATE_TOP_CANDIDATES};
use crate::optimizer::{brute_force, combinations, optimize_curve, CostMatrix};
use crate::pipeline::build_model;
use crate::types::{OptimizeInput, ValidationCase, ValidationReport};

/// Choose the reduced candidate set (column indices of `m`).
pub fn reduced_columns(m: &CostMatrix, rows: &[usize], top: usize) -> Vec<usize> {
    let k_max = VALIDATE_KS.iter().copied().max().unwrap_or(3) as usize;
    let mut chosen: Vec<usize> = Vec::new();
    for sol in optimize_curve(m, rows, k_max) {
        for c in sol.selected {
            if !chosen.contains(&c) {
                chosen.push(c);
            }
        }
    }
    // Usage: orders for which each column is the cheapest fitting box.
    let mut usage = vec![0.0; m.cols];
    for &r in rows {
        let mut best: Option<(usize, f64)> = None;
        for c in 0..m.cols {
            let v = m.get(r, c);
            if v.is_finite() && best.is_none_or(|(_, b)| v < b) {
                best = Some((c, v));
            }
        }
        if let Some((c, _)) = best {
            usage[c] += m.weight[r];
        }
    }
    let single: Vec<f64> = (0..m.cols).map(|c| m.objective(&[c], rows)).collect();
    let mut rest: Vec<usize> = (0..m.cols).filter(|c| !chosen.contains(c)).collect();
    rest.sort_by(|&a, &b| {
        usage[b]
            .total_cmp(&usage[a])
            .then(single[a].total_cmp(&single[b]))
            .then(a.cmp(&b))
    });
    chosen.extend(rest);
    chosen.truncate(top);
    chosen.sort_unstable();
    chosen
}

/// Sub-matrix with the given columns; rows that fit none of them are kept
/// out of the reduced instance by the caller.
pub fn sub_matrix(m: &CostMatrix, cols: &[usize]) -> CostMatrix {
    let mut s = CostMatrix::new(m.rows, cols.len(), m.weight.clone());
    for r in 0..m.rows {
        for (j, &c) in cols.iter().enumerate() {
            s.set(r, j, m.get(r, c));
        }
    }
    s
}

/// Run the validation.
pub fn run_validate(input: &OptimizeInput) -> Result<ValidationReport, String> {
    let model = build_model(input, &mut |_| {})?;
    let m = &model.cand_matrix;
    if model.servable.is_empty() || m.cols == 0 {
        return Err("no order fits any candidate box".into());
    }
    let cols = reduced_columns(m, &model.servable, VALIDATE_TOP_CANDIDATES);
    let sub = sub_matrix(m, &cols);
    let rows: Vec<usize> = (0..sub.rows).filter(|&r| sub.servable(r)).collect();

    let mut cases = Vec::new();
    for &k in VALIDATE_KS.iter() {
        let k = k as usize;
        if k > sub.cols {
            continue;
        }
        let t0 = now_ms();
        let heuristic = optimize_curve(&sub, &rows, k)
            .pop()
            .ok_or("heuristic returned no solution")?;
        let t1 = now_ms();
        let optimal = brute_force(&sub, &rows, k);
        let t2 = now_ms();
        let gap = if optimal.objective > 0.0 {
            (heuristic.objective - optimal.objective) / optimal.objective * 100.0
        } else {
            0.0
        };
        let factor = model.prepared.annualization.factor;
        cases.push(ValidationCase {
            k: k as u32,
            combinations: combinations(sub.cols as u64, k as u64),
            optimal_usd: optimal.objective * factor,
            heuristic_usd: heuristic.objective * factor,
            gap_pct: gap.max(0.0),
            brute_force_ms: t2 - t1,
            heuristic_ms: t1 - t0,
        });
    }
    Ok(ValidationReport {
        engine_version: env!("CARGO_PKG_VERSION").to_string(),
        candidates_used: cols.len() as u32,
        signatures: rows.len() as u32,
        cases,
    })
}
