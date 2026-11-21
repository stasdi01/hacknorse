//! Property tests for the packer (PRD §12).

use box_engine::packer::{fits, placement_is_valid, sorted_desc, usable_dims, Dims};
use proptest::prelude::*;

fn dim(lo: f64, hi: f64) -> impl Strategy<Value = f64> {
    // Quarter-inch steps, like real product data.
    ((lo * 4.0) as u32..=(hi * 4.0) as u32).prop_map(|q| f64::from(q) / 4.0)
}

fn dims(lo: f64, hi: f64) -> impl Strategy<Value = Dims> {
    (dim(lo, hi), dim(lo, hi), dim(lo, hi)).prop_map(|(a, b, c)| [a, b, c])
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(2000))]

    /// Every successful multi-item placement is inside bounds, has no
    /// overlaps and uses valid orientations.
    #[test]
    fn multi_item_placements_are_valid(
        items in prop::collection::vec(dims(0.5, 8.0), 1..12),
        box_dims in dims(2.0, 20.0),
        padding in dim(0.0, 1.0),
    ) {
        if let Some(p) = fits(&items, box_dims, padding) {
            prop_assert!(placement_is_valid(&items, &p, usable_dims(box_dims, padding)));
        }
    }

    /// Single-item results match the exact rule.
    #[test]
    fn single_item_matches_exact_rule(
        item in dims(0.25, 20.0),
        box_dims in dims(1.0, 20.0),
        padding in dim(0.0, 1.0),
    ) {
        let usable = usable_dims(box_dims, padding);
        let a = sorted_desc(item);
        let b = sorted_desc(usable);
        let exact = b[2] > 0.0 && (0..3).all(|i| a[i] <= b[i] + 1e-9);
        let got = fits(&[item], box_dims, padding);
        prop_assert_eq!(got.is_some(), exact);
        if let Some(p) = got {
            prop_assert!(placement_is_valid(&[item], &p, usable));
        }
    }

    /// Identical cubes that tile the box exactly are always packed.
    #[test]
    fn exact_cube_tilings_are_found(n in 1u32..4, side in dim(0.5, 4.0)) {
        let count = (n * n * n) as usize;
        let items = vec![[side, side, side]; count];
        let box_side = side * f64::from(n);
        prop_assert!(fits(&items, [box_side; 3], 0.0).is_some());
    }

    /// For a single item, more padding never turns a "no" into a "yes".
    #[test]
    fn single_item_padding_is_monotone(item in dims(0.5, 12.0), box_dims in dims(2.0, 16.0)) {
        if fits(&[item], box_dims, 0.0).is_none() {
            prop_assert!(fits(&[item], box_dims, 0.5).is_none());
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(500))]

    /// Compact packing in the custom-mode container is always valid, and the
    /// tight box designed from it fits its items.
    #[test]
    fn compact_packing_is_valid_and_tight_box_fits(
        items in prop::collection::vec(dims(0.5, 10.0), 1..10),
        padding in dim(0.0, 1.0),
    ) {
        let container = [60.0, 60.0, 60.0];
        let p = box_engine::packer::pack_compact(&items, container).expect("fits in container");
        prop_assert!(placement_is_valid(&items, &p, container));
        let b = box_engine::candidates::tight_box(&items, padding).expect("tight box");
        prop_assert!(fits(&items, b, padding).is_some());
    }
}
