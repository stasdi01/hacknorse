//! Fit-check benchmark harness (used by `bench/python_packer.py`).
//!
//! Loads the sample store, builds the signatures and the stock catalog, runs
//! `fits()` for every (signature, box) pair, and prints one JSON object with
//! the instance, the answers and the timing (median of 5 runs, no cache).
//!
//! Run: cargo run --release --example fit_bench > instance.json

#[path = "../tests/common/mod.rs"]
mod common;

use box_engine::candidates::stock_candidates;
use box_engine::config::DEFAULT_PADDING_IN;
use box_engine::packer::fits;
use box_engine::prep::prepare;
use box_engine::types::Mode;
use std::time::Instant;

fn main() {
    let input = common::sample_input(Mode::Stock);
    let prepared = prepare(&input);
    let boxes: Vec<[f64; 3]> = stock_candidates().iter().map(|b| b.dims).collect();
    let sigs: Vec<&Vec<[f64; 3]>> = prepared.signatures.iter().map(|s| &s.item_dims).collect();
    let padding = DEFAULT_PADDING_IN;

    let mut answers = String::with_capacity(sigs.len() * boxes.len());
    let mut times = Vec::new();
    for run in 0..5 {
        let t = Instant::now();
        let mut fit_count = 0usize;
        for items in &sigs {
            for b in &boxes {
                let ok = fits(items, *b, padding).is_some();
                fit_count += usize::from(ok);
                if run == 0 {
                    answers.push(if ok { '1' } else { '0' });
                }
            }
        }
        times.push(t.elapsed().as_secs_f64() * 1000.0);
        std::hint::black_box(fit_count);
    }
    times.sort_by(f64::total_cmp);

    let json = serde_json::json!({
        "padding": padding,
        "boxes": boxes,
        "signatures": sigs,
        "answers": answers,
        "rust_ms_median": times[times.len() / 2],
    });
    println!("{json}");
}
