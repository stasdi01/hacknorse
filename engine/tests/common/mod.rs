//! Shared helpers: load the committed sample store CSVs.
#![allow(dead_code)]

use box_engine::config::*;
use box_engine::types::*;
use std::path::PathBuf;

fn sample_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web/public/sample")
}

/// Minimal CSV reader for the sample files (no quoted commas inside).
fn read_csv(name: &str) -> Vec<Vec<String>> {
    let text = std::fs::read_to_string(sample_dir().join(name)).expect("sample csv");
    text.lines()
        .skip(1)
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.split(',').map(|c| c.trim().to_string()).collect())
        .collect()
}

pub fn default_settings(mode: Mode) -> Settings {
    Settings {
        mode,
        k: DEFAULT_K,
        padding_in: DEFAULT_PADDING_IN,
        carrier: CarrierPreset::UpsFedex,
        rate_table: RateTable {
            base_usd: RATE_BASE_USD,
            per_lb_usd: RATE_PER_LB_USD,
            max_lb: RATE_MAX_LB,
        },
        allow_current_boxes: false,
        void_fill_usd_per_ft3: VOID_FILL_USD_PER_FT3,
    }
}

pub fn sample_input(mode: Mode) -> OptimizeInput {
    let n = |s: &String| s.parse::<f64>().expect("number");
    let products = read_csv("products.csv")
        .iter()
        .map(|r| Product {
            sku: r[0].clone(),
            name: r[1].clone(),
            length_in: n(&r[2]),
            width_in: n(&r[3]),
            height_in: n(&r[4]),
            weight_lb: n(&r[5]),
        })
        .collect();
    let orders = read_csv("orders.csv")
        .iter()
        .map(|r| OrderLine {
            order_id: r[0].clone(),
            sku: r[1].clone(),
            quantity: r[2].parse().expect("qty"),
            date: r.get(3).cloned(),
        })
        .collect();
    let current_boxes = read_csv("current_boxes.csv")
        .iter()
        .map(|r| BoxSpec {
            box_id: r[0].clone(),
            length_in: n(&r[1]),
            width_in: n(&r[2]),
            height_in: n(&r[3]),
            unit_cost_usd: n(&r[4]),
        })
        .collect();
    OptimizeInput {
        products,
        orders,
        current_boxes,
        settings: default_settings(mode),
    }
}
