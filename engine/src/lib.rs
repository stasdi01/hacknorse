//! Box-set optimizer engine.
//!
//! The public API (also exported to WebAssembly) is JSON in, JSON out:
//! `optimize`, `validate` and [`version`].

pub mod baseline;
pub mod candidates;
pub mod clock;
pub mod config;
pub mod cost;
pub mod optimizer;
pub mod packer;
pub mod pipeline;
pub mod prep;
pub mod types;

use wasm_bindgen::prelude::*;

/// Engine version string (crate version).
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    #[test]
    fn version_matches_crate() {
        assert_eq!(version(), env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn input_json_round_trips() {
        let json = r#"{
            "products":[{"sku":"A","name":"a","length_in":1,"width_in":2,"height_in":3,"weight_lb":0.5}],
            "orders":[{"order_id":"1","sku":"A","quantity":2,"date":"2025-01-01"}],
            "current_boxes":[{"box_id":"B","length_in":8,"width_in":8,"height_in":8,"unit_cost_usd":1.1}],
            "settings":{"mode":"stock","k":4,"padding_in":0.5,"carrier":"ups_fedex",
              "rate_table":{"base_usd":8.5,"per_lb_usd":0.95,"max_lb":70},"allow_current_boxes":false}
        }"#;
        let input: OptimizeInput = serde_json::from_str(json).expect("parse");
        assert_eq!(input.settings.carrier, CarrierPreset::UpsFedex);
        assert_eq!(input.orders[0].quantity, 2);
        let back = serde_json::to_string(&input).expect("serialize");
        let again: OptimizeInput = serde_json::from_str(&back).expect("reparse");
        assert_eq!(input, again);
    }
}
