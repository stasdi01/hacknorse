//! Box-set optimizer engine.
//!
//! The public API (also exported to WebAssembly) is JSON in, JSON out:
//! [`optimize`], [`validate`] and [`version`]. Errors are returned as
//! `{"error": "..."}`; the engine never panics on user input.

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
pub mod validate;

use serde::Serialize;
use types::{EngineError, OptimizeInput};
use wasm_bindgen::prelude::*;

/// Engine version string (crate version).
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn to_json<T: Serialize>(result: Result<T, String>) -> String {
    let json = match result {
        Ok(v) => serde_json::to_string(&v).map_err(|e| e.to_string()),
        Err(e) => Err(e),
    };
    json.unwrap_or_else(|error| {
        serde_json::to_string(&EngineError { error })
            .unwrap_or_else(|_| r#"{"error":"internal error"}"#.to_string())
    })
}

fn parse_input(input_json: &str) -> Result<OptimizeInput, String> {
    serde_json::from_str(input_json).map_err(|e| format!("invalid input JSON: {e}"))
}

/// Optimize: input JSON → report JSON (or `{"error": ...}`).
#[wasm_bindgen]
pub fn optimize(input_json: &str) -> String {
    to_json(parse_input(input_json).and_then(|i| pipeline::run_optimize(&i)))
}

/// Optimize with stage updates: `on_stage` is called with short texts
/// such as "Checking fits…".
#[wasm_bindgen]
pub fn optimize_with_progress(input_json: &str, on_stage: &js_sys::Function) -> String {
    let mut progress = |text: &str| {
        // A failing callback must not stop the optimization.
        let _ = on_stage.call1(&JsValue::NULL, &JsValue::from_str(text));
    };
    to_json(
        parse_input(input_json)
            .and_then(|i| pipeline::run_optimize_with_progress(&i, &mut progress)),
    )
}

/// Validate: brute force vs. heuristic on a reduced instance.
#[wasm_bindgen]
pub fn validate(input_json: &str) -> String {
    to_json(parse_input(input_json).and_then(|i| validate::run_validate(&i)))
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
        let back = serde_json::to_string(&input).expect("serialize");
        let again: OptimizeInput = serde_json::from_str(&back).expect("reparse");
        assert_eq!(input, again);

        let out = optimize(json);
        let report: Report = serde_json::from_str(&out).expect("report JSON");
        assert_eq!(report.stats.orders_used, 1);
    }

    #[test]
    fn bad_input_returns_error_json_not_panic() {
        for bad in [
            "",
            "{",
            "null",
            r#"{"products":[],"orders":[],"settings":{}}"#,
            r#"{"products":[{"sku":"A","length_in":-1,"width_in":2,"height_in":3,"weight_lb":1}],
               "orders":[{"order_id":"1","sku":"A","quantity":1}],
               "settings":{"mode":"stock","k":9,"padding_in":0.5,"carrier":"usps",
               "rate_table":{"base_usd":8.5,"per_lb_usd":0.95,"max_lb":70}}}"#,
        ] {
            let out = optimize(bad);
            let err: EngineError = serde_json::from_str(&out).expect("error JSON");
            assert!(!err.error.is_empty());
            let out = validate(bad);
            let err: EngineError = serde_json::from_str(&out).expect("error JSON");
            assert!(!err.error.is_empty());
        }
    }
}
