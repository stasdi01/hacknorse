//! Baseline: each signature in the cheapest fitting current box
//! (what box-picker apps do).

use crate::optimizer::CostMatrix;

/// For each row, the column with the lowest finite cost among `cols`
/// (ties: first column). `None` if nothing fits.
pub fn cheapest_assignment(m: &CostMatrix, cols: &[usize]) -> Vec<Option<usize>> {
    (0..m.rows)
        .map(|r| {
            let mut best: Option<(usize, f64)> = None;
            for &c in cols {
                let v = m.get(r, c);
                if v.is_finite() && best.is_none_or(|(_, b)| v < b) {
                    best = Some((c, v));
                }
            }
            best.map(|(c, _)| c)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_cheapest_fitting_box() {
        let mut m = CostMatrix::new(3, 3, vec![1.0; 3]);
        m.set(0, 0, 5.0);
        m.set(0, 1, 3.0);
        m.set(1, 2, 4.0);
        assert_eq!(
            cheapest_assignment(&m, &[0, 1, 2]),
            vec![Some(1), Some(2), None]
        );
        assert_eq!(cheapest_assignment(&m, &[0]), vec![Some(0), None, None]);
    }
}
