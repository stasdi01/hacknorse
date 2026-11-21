//! Candidate box generation (stock catalog and custom sizes).

use crate::config::{CUSTOM_CONTAINER_IN, CUSTOM_ROUND_STEP_IN, MAX_CUSTOM_CANDIDATES};
use crate::cost::{custom_unit_cost, stock_unit_cost, volume_in3};
use crate::packer::{
    bounding_box, extreme_point_in_container, fits, pack_compact, sorted_desc, Dims,
};
use crate::prep::Signature;
use crate::types::{BoxSource, BoxSpec};
use serde::Deserialize;

/// The stock catalog, embedded at compile time.
const STOCK_BOXES_JSON: &str = include_str!("../data/stock_boxes.json");

/// A stock box from the catalog (interior dims, inches).
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct StockBox {
    pub box_id: String,
    pub length_in: f64,
    pub width_in: f64,
    pub height_in: f64,
}

#[derive(Deserialize)]
struct Catalog {
    boxes: Vec<StockBox>,
}

/// Load the embedded stock catalog.
pub fn stock_catalog() -> Vec<StockBox> {
    // The JSON is embedded and checked by tests; an empty catalog is the
    // safe fallback instead of a panic.
    serde_json::from_str::<Catalog>(STOCK_BOXES_JSON)
        .map(|c| c.boxes)
        .unwrap_or_default()
}

/// A box the optimizer may select (or a current box for the baseline).
#[derive(Debug, Clone, PartialEq)]
pub struct CandidateBox {
    pub box_id: String,
    pub dims: Dims,
    pub unit_cost: f64,
    pub source: BoxSource,
}

impl CandidateBox {
    /// A seller's current box.
    pub fn from_current(b: &BoxSpec) -> Self {
        Self {
            box_id: b.box_id.clone(),
            dims: [b.length_in, b.width_in, b.height_in],
            unit_cost: b.unit_cost_usd,
            source: BoxSource::Current,
        }
    }
}

/// Stock-mode candidates: the catalog with estimated unit costs.
pub fn stock_candidates() -> Vec<CandidateBox> {
    stock_catalog()
        .into_iter()
        .map(|b| {
            let dims = [b.length_in, b.width_in, b.height_in];
            CandidateBox {
                box_id: b.box_id,
                dims,
                unit_cost: stock_unit_cost(dims),
                source: BoxSource::Stock,
            }
        })
        .collect()
}

/// Round up to the custom size step (0.5 in), with a tolerance so that
/// 6.0000000001 stays 6.0.
fn round_up_step(v: f64) -> f64 {
    (v / CUSTOM_ROUND_STEP_IN - 1e-9).ceil() * CUSTOM_ROUND_STEP_IN
}

/// Box dims around an item bounding box: + 2 × padding, rounded up,
/// sorted longest first.
fn box_around(bb: Dims, padding: f64) -> Dims {
    sorted_desc([
        round_up_step(bb[0] + 2.0 * padding),
        round_up_step(bb[1] + 2.0 * padding),
        round_up_step(bb[2] + 2.0 * padding),
    ])
}

/// The tight custom box for one signature (interior dims, longest first),
/// or `None` if it cannot be packed in the 60 in container.
///
/// Single item: sorted item dims + 2 × padding, rounded up. Multi item:
/// the smallest (by volume) of several layouts that the packer confirms:
/// the compact packing in the container, the plain extreme-point packing
/// in the container, and a near-cube box grown in 5% steps from the cube
/// root of the item volume. Bounding box + padding, rounded up.
pub fn tight_box(items: &[Dims], padding: f64) -> Option<Dims> {
    if items.len() == 1 {
        return Some(box_around(items[0], padding));
    }
    let container = [CUSTOM_CONTAINER_IN; 3];
    let mut options: Vec<Dims> = Vec::new();
    for p in [
        pack_compact(items, container),
        extreme_point_in_container(items, container),
    ]
    .into_iter()
    .flatten()
    {
        options.push(box_around(bounding_box(&p), padding));
    }
    // Near-cube growth: each axis at least the largest item extent on that
    // (sorted) axis and at least the cube side.
    let mut min_dims = [0.0f64; 3];
    for d in items {
        let s = sorted_desc(*d);
        for a in 0..3 {
            min_dims[a] = min_dims[a].max(s[a]);
        }
    }
    let total: f64 = items.iter().map(|d| d[0] * d[1] * d[2]).sum();
    let side = total.cbrt();
    for step in 0..40 {
        let c = side * (1.0 + 0.05 * f64::from(step));
        if c > CUSTOM_CONTAINER_IN {
            break;
        }
        let b = box_around(
            [min_dims[0].max(c), min_dims[1].max(c), min_dims[2].max(c)],
            padding,
        );
        if fits(items, b, padding).is_some() {
            options.push(b);
            break;
        }
    }
    options
        .into_iter()
        .filter(|b| fits(items, *b, padding).is_some())
        .min_by(|a, b| {
            volume_in3(*a)
                .total_cmp(&volume_in3(*b))
                .then(a[0].total_cmp(&b[0]))
        })
}

fn custom_id(d: Dims) -> String {
    let f = |v: f64| {
        if (v - v.round()).abs() < 1e-9 {
            format!("{}", v.round())
        } else {
            format!("{v:.1}")
        }
    };
    format!("C-{}x{}x{}", f(d[0]), f(d[1]), f(d[2]))
}

fn custom_box(d: Dims) -> CandidateBox {
    CandidateBox {
        box_id: custom_id(d),
        dims: d,
        unit_cost: custom_unit_cost(d),
        source: BoxSource::Custom,
    }
}

/// Custom-mode candidates: one tight box per signature, deduplicated. If
/// there are more than `MAX_CUSTOM_CANDIDATES`, keep those generated by the
/// most orders (count-weighted), then add back the own box of any signature
/// that no kept box fits, so every packable signature stays servable.
pub fn custom_candidates(signatures: &[Signature], padding: f64) -> Vec<CandidateBox> {
    // Tight box per signature and the order count behind each distinct size.
    let mut own: Vec<Option<usize>> = Vec::with_capacity(signatures.len());
    let mut dims: Vec<Dims> = Vec::new();
    let mut score: Vec<u64> = Vec::new();
    for sig in signatures {
        match tight_box(&sig.item_dims, padding) {
            Some(d) => {
                let i = match dims.iter().position(|x| x == &d) {
                    Some(i) => i,
                    None => {
                        dims.push(d);
                        score.push(0);
                        dims.len() - 1
                    }
                };
                score[i] += u64::from(sig.count);
                own.push(Some(i));
            }
            None => own.push(None),
        }
    }

    let mut order: Vec<usize> = (0..dims.len()).collect();
    order.sort_by(|&a, &b| {
        score[b]
            .cmp(&score[a])
            .then(volume_in3(dims[a]).total_cmp(&volume_in3(dims[b])))
            .then(a.cmp(&b))
    });
    let mut keep: Vec<usize> = order.iter().take(MAX_CUSTOM_CANDIDATES).copied().collect();

    if dims.len() > MAX_CUSTOM_CANDIDATES {
        // Coverage pass.
        for (sig, o) in signatures.iter().zip(&own) {
            let Some(o) = *o else { continue };
            if keep.contains(&o) {
                continue;
            }
            let covered = keep
                .iter()
                .any(|&k| fits(&sig.item_dims, dims[k], padding).is_some());
            if !covered {
                keep.push(o);
            }
        }
    }
    keep.sort_by(|&a, &b| {
        volume_in3(dims[a])
            .total_cmp(&volume_in3(dims[b]))
            .then(a.cmp(&b))
    });
    keep.into_iter().map(|i| custom_box(dims[i])).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn catalog_loads_about_80_unique_positive_boxes() {
        let boxes = stock_catalog();
        assert!((75..=90).contains(&boxes.len()), "got {}", boxes.len());
        let ids: HashSet<_> = boxes.iter().map(|b| b.box_id.clone()).collect();
        assert_eq!(ids.len(), boxes.len(), "box ids must be unique");
        for b in &boxes {
            assert!(b.length_in > 0.0 && b.width_in > 0.0 && b.height_in > 0.0);
        }
    }

    #[test]
    fn single_item_tight_box_adds_padding_and_rounds_up() {
        assert_eq!(tight_box(&[[3.2, 3.6, 3.2]], 0.5), Some([5.0, 4.5, 4.5]));
        assert_eq!(tight_box(&[[2.0, 3.0, 1.0]], 0.5), Some([4.0, 3.0, 2.0]));
    }

    #[test]
    fn multi_item_tight_box_is_compact_and_fits() {
        let items = [[3.0, 3.0, 3.0], [3.0, 3.0, 3.0], [2.0, 1.0, 1.0]];
        let b = tight_box(&items, 0.5).expect("box");
        assert!(fits(&items, b, 0.5).is_some());
        // Two 3-inch cubes side by side (6 × 3 × 3) plus the small item at
        // the end (7 × 3 × 3), + 2 × 0.5 padding.
        assert_eq!(b, [8.0, 4.0, 4.0]);
    }

    #[test]
    fn custom_ids_are_readable() {
        assert_eq!(custom_id([10.0, 8.5, 6.0]), "C-10x8.5x6");
    }

    #[test]
    fn catalog_contains_all_cubes_4_to_24() {
        let boxes = stock_catalog();
        for s in (4..=24).step_by(2) {
            let s = f64::from(s);
            assert!(
                boxes
                    .iter()
                    .any(|b| b.length_in == s && b.width_in == s && b.height_in == s),
                "missing cube {s}"
            );
        }
    }
}
