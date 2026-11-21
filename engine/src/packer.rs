//! 3D packer: does a set of items fit in a box?
//!
//! - Single item: exact rule (sorted item dims ≤ sorted usable dims).
//! - Multiple items: extreme-point heuristic (Crainic, Perboli & Tadei, 2008,
//!   simplified). It is conservative: it may answer "no" for a feasible
//!   packing, but every "yes" comes with a valid, non-overlapping placement.

use crate::config::EPS;
use std::collections::HashMap;

/// Dimensions (or a position) along x, y, z.
pub type Dims = [f64; 3];

/// One placed item, in usable-space coordinates (origin at the padded corner).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Placed {
    /// Index of the item in the input slice.
    pub item: usize,
    pub pos: Dims,
    pub size: Dims,
}

/// Item dims sorted descending.
pub fn sorted_desc(d: Dims) -> Dims {
    let mut s = d;
    s.sort_by(|a, b| b.total_cmp(a));
    s
}

/// Usable dims of a box after padding on every side.
pub fn usable_dims(box_dims: Dims, padding: f64) -> Dims {
    [
        box_dims[0] - 2.0 * padding,
        box_dims[1] - 2.0 * padding,
        box_dims[2] - 2.0 * padding,
    ]
}

fn volume(d: Dims) -> f64 {
    d[0] * d[1] * d[2]
}

/// Exact single-item rule on already sorted dims.
fn sorted_fit(item_sorted: Dims, usable_sorted: Dims) -> bool {
    (0..3).all(|i| item_sorted[i] <= usable_sorted[i] + EPS)
}

/// The 6 axis-aligned orientations of an item, duplicates removed.
pub fn orientations(d: Dims) -> Vec<Dims> {
    let [a, b, c] = d;
    let mut out: Vec<Dims> = Vec::with_capacity(6);
    for o in [
        [a, b, c],
        [a, c, b],
        [b, a, c],
        [b, c, a],
        [c, a, b],
        [c, b, a],
    ] {
        if !out.iter().any(|p| p == &o) {
            out.push(o);
        }
    }
    out
}

/// True if two boxes overlap with positive volume.
fn overlaps(p1: Dims, s1: Dims, p2: Dims, s2: Dims) -> bool {
    (0..3).all(|i| p1[i] < p2[i] + s2[i] - EPS && p2[i] < p1[i] + s1[i] - EPS)
}

/// Check whether `items` fit in a box with interior `box_dims` and the given
/// `padding` per side. Returns the placements (usable-space coordinates).
pub fn fits(items: &[Dims], box_dims: Dims, padding: f64) -> Option<Vec<Placed>> {
    if items.is_empty() {
        return Some(Vec::new());
    }
    let usable = usable_dims(box_dims, padding);
    if usable.iter().any(|&u| u <= 0.0) {
        return None;
    }
    let usable_sorted = sorted_desc(usable);

    // Fast rejects.
    let total: f64 = items.iter().map(|&d| volume(d)).sum();
    if total > volume(usable) + EPS {
        return None;
    }
    if items
        .iter()
        .any(|&d| !sorted_fit(sorted_desc(d), usable_sorted))
    {
        return None;
    }

    if items.len() == 1 {
        return Some(vec![place_single(items[0], usable)]);
    }

    // Attempt 1: volume descending (tie: longest side).
    let mut order: Vec<usize> = (0..items.len()).collect();
    order.sort_by(|&a, &b| {
        volume(items[b])
            .total_cmp(&volume(items[a]))
            .then(sorted_desc(items[b])[0].total_cmp(&sorted_desc(items[a])[0]))
            .then(a.cmp(&b))
    });
    if let Some(p) = extreme_point_pack(items, &order, usable) {
        return Some(p);
    }
    // Attempt 2: longest side descending (tie: volume).
    order.sort_by(|&a, &b| {
        sorted_desc(items[b])[0]
            .total_cmp(&sorted_desc(items[a])[0])
            .then(volume(items[b]).total_cmp(&volume(items[a])))
            .then(a.cmp(&b))
    });
    extreme_point_pack(items, &order, usable)
}

/// Place a single item at the origin, matching its sorted dims to the
/// sorted usable axes (caller has checked that it fits).
fn place_single(item: Dims, usable: Dims) -> Placed {
    let item_sorted = sorted_desc(item);
    // Axis indices of the usable space, longest first.
    let mut axes = [0usize, 1, 2];
    axes.sort_by(|&a, &b| usable[b].total_cmp(&usable[a]).then(a.cmp(&b)));
    let mut size = [0.0; 3];
    for (rank, &axis) in axes.iter().enumerate() {
        size[axis] = item_sorted[rank];
    }
    Placed {
        item: 0,
        pos: [0.0; 3],
        size,
    }
}

/// Extreme-point placement of the items in the given order.
fn extreme_point_pack(items: &[Dims], order: &[usize], usable: Dims) -> Option<Vec<Placed>> {
    let mut placed: Vec<Placed> = Vec::with_capacity(items.len());
    let mut points: Vec<Dims> = vec![[0.0; 3]];

    for &idx in order {
        // Sort extreme points by (z, y, x).
        points.sort_by(|a, b| {
            a[2].total_cmp(&b[2])
                .then(a[1].total_cmp(&b[1]))
                .then(a[0].total_cmp(&b[0]))
        });
        let orients = orientations(items[idx]);
        let mut chosen: Option<(usize, Dims)> = None;
        'search: for (pi, &p) in points.iter().enumerate() {
            for &o in &orients {
                if (0..3).any(|i| p[i] + o[i] > usable[i] + EPS) {
                    continue;
                }
                if placed.iter().any(|q| overlaps(p, o, q.pos, q.size)) {
                    continue;
                }
                chosen = Some((pi, o));
                break 'search;
            }
        }
        let (pi, size) = chosen?;
        let pos = points.swap_remove(pi);
        placed.push(Placed {
            item: idx,
            pos,
            size,
        });
        for np in [
            [pos[0] + size[0], pos[1], pos[2]],
            [pos[0], pos[1] + size[1], pos[2]],
            [pos[0], pos[1], pos[2] + size[2]],
        ] {
            let inside = (0..3).all(|i| np[i] < usable[i] - EPS);
            let dup = points
                .iter()
                .any(|q| (0..3).all(|i| (q[i] - np[i]).abs() <= EPS));
            if inside && !dup {
                points.push(np);
            }
        }
    }
    placed.sort_by_key(|p| p.item);
    Some(placed)
}

/// Cache of fit results per (signature id, box id).
#[derive(Debug, Default)]
pub struct FitCache {
    map: HashMap<(u32, u32), Option<Vec<Placed>>>,
    hits: u64,
}

impl FitCache {
    pub fn new() -> Self {
        Self::default()
    }

    /// Return the cached result or compute it with [`fits`].
    pub fn get_or_compute(
        &mut self,
        signature_id: u32,
        box_id: u32,
        items: &[Dims],
        box_dims: Dims,
        padding: f64,
    ) -> Option<&[Placed]> {
        let key = (signature_id, box_id);
        match self.map.entry(key) {
            std::collections::hash_map::Entry::Occupied(_) => self.hits += 1,
            std::collections::hash_map::Entry::Vacant(v) => {
                v.insert(fits(items, box_dims, padding));
            }
        }
        self.map.get(&key).and_then(|r| r.as_deref())
    }

    /// Number of cache hits so far.
    pub fn hits(&self) -> u64 {
        self.hits
    }

    /// Number of cached entries.
    pub fn len(&self) -> usize {
        self.map.len()
    }

    pub fn is_empty(&self) -> bool {
        self.map.is_empty()
    }
}

/// Check a placement: every item inside the usable space, no overlaps, and
/// every size a permutation of its item's dims. Used by tests and as a
/// safety net.
pub fn placement_is_valid(items: &[Dims], placed: &[Placed], usable: Dims) -> bool {
    if placed.len() != items.len() {
        return false;
    }
    for (i, p) in placed.iter().enumerate() {
        if p.item >= items.len() {
            return false;
        }
        if (0..3).any(|a| p.pos[a] < -EPS || p.pos[a] + p.size[a] > usable[a] + EPS) {
            return false;
        }
        let s1 = sorted_desc(p.size);
        let s2 = sorted_desc(items[p.item]);
        if (0..3).any(|a| (s1[a] - s2[a]).abs() > EPS) {
            return false;
        }
        for q in &placed[i + 1..] {
            if q.item == p.item || overlaps(p.pos, p.size, q.pos, q.size) {
                return false;
            }
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_item_exact_rule() {
        // 8x8x8 box, 0.5 padding → 7x7x7 usable.
        assert!(fits(&[[7.0, 7.0, 7.0]], [8.0, 8.0, 8.0], 0.5).is_some());
        assert!(fits(&[[7.1, 1.0, 1.0]], [8.0, 8.0, 8.0], 0.5).is_none());
        // Rotation: a long thin item fits along the box's long axis.
        let p = fits(&[[1.0, 11.0, 2.0]], [12.0, 4.0, 3.0], 0.5).expect("fits");
        assert_eq!(p[0].size, [11.0, 2.0, 1.0]);
    }

    #[test]
    fn two_items_side_by_side() {
        let items = [[5.0, 5.0, 5.0], [5.0, 5.0, 5.0]];
        let p = fits(&items, [10.0, 5.0, 5.0], 0.0).expect("fits");
        assert!(placement_is_valid(&items, &p, [10.0, 5.0, 5.0]));
        assert!(fits(&items, [9.0, 5.0, 5.0], 0.0).is_none());
    }

    #[test]
    fn eight_cubes_fill_a_cube_exactly() {
        let items = [[2.0, 2.0, 2.0]; 8];
        let p = fits(&items, [4.0, 4.0, 4.0], 0.0).expect("fits");
        assert!(placement_is_valid(&items, &p, [4.0, 4.0, 4.0]));
    }

    #[test]
    fn volume_fast_reject() {
        let items = [[3.0, 3.0, 3.0]; 3];
        assert!(fits(&items, [4.0, 4.0, 4.0], 0.0).is_none());
    }

    #[test]
    fn padding_too_large_never_fits() {
        assert!(fits(&[[0.1, 0.1, 0.1]], [2.0, 2.0, 2.0], 1.0).is_none());
    }

    #[test]
    fn cache_returns_same_result_and_counts_hits() {
        let mut cache = FitCache::new();
        let items = [[2.0, 2.0, 2.0], [2.0, 2.0, 2.0]];
        let first = cache
            .get_or_compute(1, 7, &items, [5.0, 5.0, 5.0], 0.0)
            .map(|p| p.to_vec());
        let second = cache
            .get_or_compute(1, 7, &items, [5.0, 5.0, 5.0], 0.0)
            .map(|p| p.to_vec());
        assert_eq!(first, second);
        assert_eq!(cache.hits(), 1);
        assert_eq!(cache.len(), 1);
    }
}
