//! End-to-end engine run on the committed sample store.

mod common;

use box_engine::pipeline::run_optimize;
use box_engine::types::Mode;
use std::time::Instant;

#[test]
fn stock_mode_on_sample_store() {
    let input = common::sample_input(Mode::Stock);
    let t = Instant::now();
    let report = run_optimize(&input).expect("optimize");
    let elapsed = t.elapsed().as_secs_f64();

    println!(
        "sample stock: {:.0} ms, {} signatures, {} candidates, savings ${:.0}/yr ({:.1}%), empty {:.1}% -> {:.1}%",
        elapsed * 1000.0,
        report.stats.signatures,
        report.stats.candidates,
        report.summary.savings_usd,
        report.summary.savings_pct,
        report.summary.baseline.empty_space_pct,
        report.summary.optimized.empty_space_pct,
    );
    for p in &report.curve {
        println!("  K={} ${:.0} {:?}", p.k, p.total_usd, p.box_ids);
    }

    // Performance target: < 2 s (release build; debug builds get slack).
    let limit = if cfg!(debug_assertions) { 20.0 } else { 2.0 };
    assert!(elapsed < limit, "took {elapsed:.2} s");

    assert_eq!(report.stats.orders_total, 3000);
    assert_eq!(report.curve.len(), 8);
    assert_eq!(report.recommended.len(), 4);
    for w in report.curve.windows(2) {
        assert!(
            w[1].total_usd <= w[0].total_usd + 1e-6,
            "curve must not increase"
        );
    }
    assert!(
        report.summary.savings_usd > 0.0,
        "should beat guesswork boxes"
    );
    assert!(report.summary.optimized.empty_space_pct < report.summary.baseline.empty_space_pct);
    assert!(!report.annualization.assumed_one_year);
    assert!(report.placements.len() <= 50 && !report.placements.is_empty());
    for p in &report.placements {
        if let Some(b) = &p.optimized {
            for it in &b.items {
                assert!(it.x + it.l <= b.length_in + 1e-9);
                assert!(it.y + it.w <= b.width_in + 1e-9);
                assert!(it.z + it.h <= b.height_in + 1e-9);
            }
        }
    }
    let pct: f64 = report.recommended.iter().map(|b| b.orders_pct).sum();
    assert!((pct - 100.0).abs() < 1e-6);
}

#[test]
fn optimize_is_deterministic() {
    let input = common::sample_input(Mode::Stock);
    let mut a = run_optimize(&input).expect("a");
    let mut b = run_optimize(&input).expect("b");
    a.timings_ms = Default::default();
    b.timings_ms = Default::default();
    assert_eq!(a, b);
}

#[test]
fn custom_mode_on_sample_store() {
    let input = common::sample_input(Mode::Custom);
    let t = Instant::now();
    let report = run_optimize(&input).expect("optimize");
    let elapsed = t.elapsed().as_secs_f64();
    println!(
        "sample custom: {:.0} ms, {} candidates, savings ${:.0}/yr ({:.1}%), empty {:.1}% -> {:.1}%, boxes {:?}",
        elapsed * 1000.0,
        report.stats.candidates,
        report.summary.savings_usd,
        report.summary.savings_pct,
        report.summary.baseline.empty_space_pct,
        report.summary.optimized.empty_space_pct,
        report.recommended.iter().map(|b| b.box_id.clone()).collect::<Vec<_>>(),
    );
    println!("  timings {:?}", report.timings_ms);
    // Performance target: < 10 s (release build; debug builds get slack).
    let limit = if cfg!(debug_assertions) { 120.0 } else { 10.0 };
    assert!(elapsed < limit, "took {elapsed:.2} s");
    assert!(report.stats.candidates > 0);
    assert!(report
        .recommended
        .iter()
        .all(|b| b.source == box_engine::types::BoxSource::Custom));
    for w in report.curve.windows(2) {
        assert!(w[1].total_usd <= w[0].total_usd + 1e-6);
    }
    // Every packable order fits some custom candidate.
    assert!(report
        .flagged
        .iter()
        .all(|f| f.reason != box_engine::types::FlagReason::FitsNoCandidate));
}

#[test]
fn validation_on_sample_store() {
    for mode in [Mode::Stock, Mode::Custom] {
        let input = common::sample_input(mode);
        let v = box_engine::validate::run_validate(&input).expect("validate");
        println!("validate {mode:?}: {:?}", v.cases);
        assert_eq!(v.candidates_used, 25);
        assert_eq!(v.cases.len(), 2);
        assert_eq!(v.cases[0].combinations, 300);
        assert_eq!(v.cases[1].combinations, 2300);
        for c in &v.cases {
            assert!(c.heuristic_usd + 1e-6 >= c.optimal_usd);
            assert!(c.gap_pct < 1.0, "gap {}", c.gap_pct);
        }
    }
}
