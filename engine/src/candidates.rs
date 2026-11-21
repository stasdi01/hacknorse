//! Candidate box generation (stock catalog and custom sizes).

use crate::cost::stock_unit_cost;
use crate::packer::Dims;
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

/// Custom-mode candidates (implemented in milestone M11; until then the
/// stock catalog is used).
pub fn custom_candidates(
    _signatures: &[crate::prep::Signature],
    _padding: f64,
) -> Vec<CandidateBox> {
    stock_candidates()
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
