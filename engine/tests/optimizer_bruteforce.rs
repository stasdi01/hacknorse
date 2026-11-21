//! On tiny instances built from real box geometry, greedy + swap equals
//! brute force (PRD §12).

use box_engine::cost::{evaluate, stock_unit_cost};
use box_engine::optimizer::{brute_force, optimize_curve, CostMatrix};
use box_engine::packer::{fits, Dims};
use box_engine::types::{CarrierPreset, RateTable};

struct Lcg(u64);
impl Lcg {
    fn next(&mut self) -> f64 {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        (self.0 >> 33) as f64 / f64::from(u32::MAX)
    }
    fn dim(&mut self, lo: f64, hi: f64) -> f64 {
        ((lo + self.next() * (hi - lo)) * 4.0).round() / 4.0
    }
}

fn instance(seed: u64, n_sigs: usize, n_boxes: usize) -> (CostMatrix, Vec<usize>) {
    let mut g = Lcg(seed);
    let table = RateTable {
        base_usd: 8.5,
        per_lb_usd: 0.95,
        max_lb: 70.0,
    };
    let boxes: Vec<Dims> = (0..n_boxes)
        .map(|_| [g.dim(4.0, 20.0), g.dim(4.0, 16.0), g.dim(2.0, 14.0)])
        .collect();
    let mut sigs: Vec<(Vec<Dims>, f64)> = Vec::new();
    for _ in 0..n_sigs {
        let n = 1 + (g.next() * 3.0) as usize;
        let items: Vec<Dims> = (0..n)
            .map(|_| [g.dim(1.0, 8.0), g.dim(1.0, 6.0), g.dim(0.5, 6.0)])
            .collect();
        sigs.push((items, 1.0 + (g.next() * 30.0).floor()));
    }
    let mut m = CostMatrix::new(n_sigs, n_boxes, sigs.iter().map(|s| s.1).collect());
    for (r, (items, _)) in sigs.iter().enumerate() {
        let vol: f64 = items.iter().map(|d| d[0] * d[1] * d[2]).sum();
        let weight = vol * 0.02;
        for (c, b) in boxes.iter().enumerate() {
            if fits(items, *b, 0.5).is_some() {
                let e = evaluate(
                    vol,
                    weight,
                    *b,
                    stock_unit_cost(*b),
                    CarrierPreset::UpsFedex,
                    &table,
                );
                m.set(r, c, e.total_usd);
            }
        }
    }
    let rows = (0..n_sigs).filter(|&r| m.servable(r)).collect();
    (m, rows)
}

#[test]
fn greedy_plus_swap_equals_brute_force_on_tiny_geometric_instances() {
    for seed in 0..60 {
        let (m, rows) = instance(seed, 15, 10);
        let curve = optimize_curve(&m, &rows, 4);
        for (i, sol) in curve.iter().enumerate() {
            let bf = brute_force(&m, &rows, i + 1);
            assert!(
                (sol.objective - bf.objective).abs() <= 1e-9 * bf.objective.max(1.0),
                "seed {seed} k {}: {} vs {}",
                i + 1,
                sol.objective,
                bf.objective
            );
        }
    }
}

#[test]
fn k_curve_never_increases() {
    for seed in 100..130 {
        let (m, rows) = instance(seed, 30, 20);
        let curve = optimize_curve(&m, &rows, 8);
        for w in curve.windows(2) {
            assert!(w[1].objective <= w[0].objective + 1e-9);
        }
    }
}
