//! Candidate box generation (stock catalog and custom sizes).

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
