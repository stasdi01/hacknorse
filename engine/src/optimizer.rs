//! Choose K boxes (p-median / facility location).
//!
//! Objective: Σ weight(s) × min over selected fitting boxes of cost(s, b).
//! A servable signature with no fitting selected box costs
//! `UNSERVED_PENALTY_USD` per order, so it must be served whenever possible.
//! Algorithm: greedy, then swap local search (deterministic).

use crate::config::{LOCAL_SEARCH_MAX_ROUNDS, UNSERVED_PENALTY_USD};

/// Dense cost matrix: rows = signatures, columns = candidate boxes.
/// `f64::INFINITY` means "does not fit".
#[derive(Debug, Clone)]
pub struct CostMatrix {
    pub rows: usize,
    pub cols: usize,
    pub cost: Vec<f64>,
    /// Weight per row (number of orders).
    pub weight: Vec<f64>,
}

impl CostMatrix {
    pub fn new(rows: usize, cols: usize, weight: Vec<f64>) -> Self {
        Self {
            rows,
            cols,
            cost: vec![f64::INFINITY; rows * cols],
            weight,
        }
    }

    #[inline]
    pub fn get(&self, r: usize, c: usize) -> f64 {
        self.cost[r * self.cols + c]
    }

    #[inline]
    pub fn set(&mut self, r: usize, c: usize, v: f64) {
        self.cost[r * self.cols + c] = v;
    }

    /// True if at least one candidate fits row `r`.
    pub fn servable(&self, r: usize) -> bool {
        (0..self.cols).any(|c| self.get(r, c).is_finite())
    }

    /// Per-order cost of row `r` under a selection (penalty if unserved).
    fn row_cost(&self, r: usize, sel: &[usize]) -> f64 {
        sel.iter()
            .map(|&c| self.get(r, c))
            .fold(UNSERVED_PENALTY_USD, f64::min)
    }

    /// Weighted objective of a selection (servable rows only).
    pub fn objective(&self, sel: &[usize], rows: &[usize]) -> f64 {
        rows.iter()
            .map(|&r| self.weight[r] * self.row_cost(r, sel))
            .sum()
    }
}

/// Result of optimizing for one K.
#[derive(Debug, Clone, PartialEq)]
pub struct Solution {
    /// Selected column indices, sorted ascending.
    pub selected: Vec<usize>,
    pub objective: f64,
}

fn improves(new: f64, old: f64) -> bool {
    new < old - 1e-9 * old.abs().max(1.0)
}

/// Add `extra` boxes greedily to `start` (largest objective decrease first).
fn greedy_extend(m: &CostMatrix, rows: &[usize], start: &[usize], extra: usize) -> Vec<usize> {
    let mut sel = start.to_vec();
    let mut best: Vec<f64> = rows.iter().map(|&r| m.row_cost(r, &sel)).collect();
    for _ in 0..extra {
        let mut pick: Option<(usize, f64)> = None;
        for c in 0..m.cols {
            if sel.contains(&c) {
                continue;
            }
            let gain: f64 = rows
                .iter()
                .zip(&best)
                .map(|(&r, &b)| m.weight[r] * (b - m.get(r, c)).max(0.0))
                .sum();
            if pick.is_none_or(|(_, g)| gain > g) {
                pick = Some((c, gain));
            }
        }
        let Some((c, _)) = pick else { break };
        sel.push(c);
        for (i, &r) in rows.iter().enumerate() {
            best[i] = best[i].min(m.get(r, c));
        }
    }
    sel
}

/// Swap local search: try replacing each selected box with each unselected
/// box; accept the first improvement; repeat until no improvement or the
/// round limit.
fn local_search(m: &CostMatrix, rows: &[usize], mut sel: Vec<usize>) -> Solution {
    let n = rows.len();
    let mut best1 = vec![0.0; n];
    let mut best1_pos = vec![usize::MAX; n];
    let mut best2 = vec![0.0; n];
    for _ in 0..LOCAL_SEARCH_MAX_ROUNDS {
        // Best and second-best cost per row under the current selection.
        for (ri, &r) in rows.iter().enumerate() {
            let (mut b1, mut p1, mut b2) = (UNSERVED_PENALTY_USD, usize::MAX, UNSERVED_PENALTY_USD);
            for (pos, &c) in sel.iter().enumerate() {
                let v = m.get(r, c);
                if v < b1 {
                    b2 = b1;
                    b1 = v;
                    p1 = pos;
                } else if v < b2 {
                    b2 = v;
                }
            }
            best1[ri] = b1;
            best1_pos[ri] = p1;
            best2[ri] = b2;
        }
        let current: f64 = rows
            .iter()
            .zip(&best1)
            .map(|(&r, &b)| m.weight[r] * b)
            .sum();

        // Best-improvement swap: replace sel[pos] by column c.
        let mut best_move: Option<(usize, usize, f64)> = None;
        for pos in 0..sel.len() {
            for c in 0..m.cols {
                if sel.contains(&c) {
                    continue;
                }
                let mut o = 0.0;
                for (ri, &r) in rows.iter().enumerate() {
                    let keep = if best1_pos[ri] == pos {
                        best2[ri]
                    } else {
                        best1[ri]
                    };
                    o += m.weight[r] * keep.min(m.get(r, c));
                }
                if improves(o, best_move.map_or(current, |b| b.2)) {
                    best_move = Some((pos, c, o));
                }
            }
        }
        match best_move {
            Some((pos, c, _)) => sel[pos] = c,
            None => break,
        }
    }
    sel.sort_unstable();
    let objective = m.objective(&sel, rows);
    Solution {
        selected: sel,
        objective,
    }
}

/// Number of extra deterministic starts (best single boxes as seeds).
const MULTI_STARTS: usize = 6;

/// Greedy + local search for exactly `k` boxes, keeping the best of:
/// a plain greedy start, `prev` plus one greedy box (if given), and greedy
/// starts seeded with each of the best single boxes.
fn solve_k(
    m: &CostMatrix,
    rows: &[usize],
    k: usize,
    prev: Option<&Solution>,
    seeds: &[usize],
) -> Solution {
    let mut best = local_search(m, rows, greedy_extend(m, rows, &[], k));
    let consider = |cand: Solution, best: &mut Solution| {
        if improves(cand.objective, best.objective) {
            *best = cand;
        }
    };
    if let Some(p) = prev {
        consider(
            local_search(m, rows, greedy_extend(m, rows, &p.selected, 1)),
            &mut best,
        );
    }
    if k > 1 {
        for &seed in seeds {
            consider(
                local_search(m, rows, greedy_extend(m, rows, &[seed], k - 1)),
                &mut best,
            );
        }
    }
    best
}

/// Optimize for every K in 1..=k_max (the K-curve). Each K keeps the best of
/// several deterministic greedy starts followed by swap local search; one
/// start extends the K−1 solution, so more box sizes never cost more.
pub fn optimize_curve(m: &CostMatrix, rows: &[usize], k_max: usize) -> Vec<Solution> {
    let k_max = k_max.min(m.cols);
    // Seeds: the columns that are best on their own.
    let mut singles: Vec<(usize, f64)> =
        (0..m.cols).map(|c| (c, m.objective(&[c], rows))).collect();
    singles.sort_by(|a, b| a.1.total_cmp(&b.1).then(a.0.cmp(&b.0)));
    let seeds: Vec<usize> = singles.iter().take(MULTI_STARTS).map(|s| s.0).collect();

    let mut out: Vec<Solution> = Vec::with_capacity(k_max);
    for k in 1..=k_max {
        let sol = solve_k(m, rows, k, out.last(), &seeds);
        out.push(sol);
    }
    out
}

/// Exhaustive search over all K-subsets of the columns (small instances).
pub fn brute_force(m: &CostMatrix, rows: &[usize], k: usize) -> Solution {
    let n = m.cols;
    let k = k.min(n);
    let mut best = Solution {
        selected: Vec::new(),
        objective: f64::INFINITY,
    };
    if k == 0 {
        return best;
    }
    let mut idx: Vec<usize> = (0..k).collect();
    loop {
        let o = m.objective(&idx, rows);
        if o < best.objective {
            best = Solution {
                selected: idx.clone(),
                objective: o,
            };
        }
        // Next combination in lexicographic order.
        let mut i = k;
        loop {
            if i == 0 {
                return best;
            }
            i -= 1;
            if idx[i] != i + n - k {
                break;
            }
            if i == 0 && idx[0] == n - k {
                return best;
            }
        }
        idx[i] += 1;
        for j in i + 1..k {
            idx[j] = idx[j - 1] + 1;
        }
    }
}

/// n choose k (saturating).
pub fn combinations(n: u64, k: u64) -> u64 {
    if k > n {
        return 0;
    }
    let k = k.min(n - k);
    let mut r: u64 = 1;
    for i in 0..k {
        r = r.saturating_mul(n - i) / (i + 1);
    }
    r
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Deterministic pseudo-random matrix (LCG) with some non-fitting cells.
    fn random_matrix(seed: u64, rows: usize, cols: usize) -> CostMatrix {
        let mut s = seed;
        let mut next = || {
            s = s
                .wrapping_mul(6_364_136_223_846_793_005)
                .wrapping_add(1_442_695_040_888_963_407);
            (s >> 33) as f64 / f64::from(u32::MAX)
        };
        let weight = (0..rows).map(|_| 1.0 + (next() * 20.0).floor()).collect();
        let mut m = CostMatrix::new(rows, cols, weight);
        for r in 0..rows {
            for c in 0..cols {
                if next() < 0.75 {
                    m.set(r, c, 5.0 + next() * 20.0);
                }
            }
        }
        m
    }

    fn all_servable(m: &CostMatrix) -> Vec<usize> {
        (0..m.rows).filter(|&r| m.servable(r)).collect()
    }

    #[test]
    fn heuristic_is_near_optimal_on_random_matrices() {
        let mut fails = 0;
        let mut total = 0;
        let mut worst: f64 = 0.0;
        for seed in 0..400 {
            let m = random_matrix(seed, 12, 7);
            let rows = all_servable(&m);
            let curve = optimize_curve(&m, &rows, 4);
            for (i, sol) in curve.iter().enumerate() {
                let bf = brute_force(&m, &rows, i + 1);
                total += 1;
                let gap = (sol.objective - bf.objective) / bf.objective;
                if gap > 1e-9 {
                    fails += 1;
                    worst = worst.max(gap);
                }
            }
        }
        // Adversarial random matrices: almost always optimal, small worst gap.
        assert!(fails * 100 <= total, "{fails}/{total} non-optimal");
        assert!(worst < 0.05, "worst gap {worst}");
    }

    #[test]
    fn curve_is_non_increasing() {
        for seed in 0..40 {
            let m = random_matrix(seed + 100, 40, 15);
            let rows = all_servable(&m);
            let curve = optimize_curve(&m, &rows, 8);
            for w in curve.windows(2) {
                assert!(w[1].objective <= w[0].objective + 1e-9);
            }
        }
    }

    #[test]
    fn single_box_must_serve_everything_when_possible() {
        // Box 0 is cheap but only fits row 0; box 1 fits both.
        let mut m = CostMatrix::new(2, 2, vec![100.0, 1.0]);
        m.set(0, 0, 1.0);
        m.set(0, 1, 10.0);
        m.set(1, 1, 10.0);
        let rows = vec![0, 1];
        let curve = optimize_curve(&m, &rows, 2);
        assert_eq!(curve[0].selected, vec![1]);
        assert_eq!(curve[1].selected, vec![0, 1]);
    }

    #[test]
    fn brute_force_enumerates_all_combinations() {
        assert_eq!(combinations(25, 3), 2300);
        assert_eq!(combinations(5, 0), 1);
        assert_eq!(combinations(3, 5), 0);
        let m = random_matrix(7, 5, 6);
        let rows = all_servable(&m);
        let bf = brute_force(&m, &rows, 6);
        assert_eq!(bf.selected, vec![0, 1, 2, 3, 4, 5]);
    }

    #[test]
    fn is_deterministic() {
        let m = random_matrix(3, 30, 20);
        let rows = all_servable(&m);
        assert_eq!(optimize_curve(&m, &rows, 8), optimize_curve(&m, &rows, 8));
    }
}
