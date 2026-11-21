//! Cost model: box weight, DIM weight, billable weight, shipping and box cost.

use crate::config::*;
use crate::packer::{usable_dims, Dims};
use crate::types::{BoxMetrics, CarrierPreset, RateTable, Settings};

/// Box surface area (in²) from interior dims.
pub fn surface_area_in2(d: Dims) -> f64 {
    2.0 * (d[0] * d[1] + d[0] * d[2] + d[1] * d[2])
}

/// Interior volume (in³).
pub fn volume_in3(d: Dims) -> f64 {
    d[0] * d[1] * d[2]
}

/// Cardboard weight of a box (lb) = surface (ft²) × board weight.
pub fn box_weight_lb(d: Dims) -> f64 {
    surface_area_in2(d) / 144.0 * BOARD_WEIGHT_LB_PER_FT2
}

/// Stock box unit cost ESTIMATE (USD).
pub fn stock_unit_cost(d: Dims) -> f64 {
    STOCK_COST_BASE_USD + STOCK_COST_PER_IN2_USD * surface_area_in2(d)
}

/// Custom box unit cost ESTIMATE (USD).
pub fn custom_unit_cost(d: Dims) -> f64 {
    stock_unit_cost(d) * CUSTOM_COST_MULTIPLIER
}

/// DIM weight (lb) for a box under a carrier preset.
pub fn dim_weight_lb(d: Dims, carrier: CarrierPreset) -> f64 {
    let v = volume_in3(d);
    match carrier {
        CarrierPreset::UpsFedex => v / DIM_DIVISOR_UPS_FEDEX,
        CarrierPreset::Usps => {
            if v > USPS_DIM_MIN_VOLUME_IN3 {
                v / DIM_DIVISOR_USPS
            } else {
                0.0
            }
        }
    }
}

/// Billable weight: max(actual, DIM) rounded up to the next whole lb (min 1).
pub fn billable_lb(actual_lb: f64, dim_lb: f64) -> f64 {
    // Small tolerance so 2.0000000001 (float noise) bills as 2 lb.
    let w = actual_lb.max(dim_lb);
    (w - 1e-9).ceil().max(1.0)
}

/// Shipping price (USD) from the rate table for a billable weight (lb).
/// Weights above `max_lb` extend the line.
pub fn shipping_usd(billable: f64, table: &RateTable) -> f64 {
    table.base_usd + table.per_lb_usd * (billable.max(1.0) - 1.0)
}

/// Void-fill volume (in³) of an order in a box: usable volume (interior
/// minus padding on every side) minus item volume, never negative.
pub fn void_fill_in3(item_volume_in3: f64, d: Dims, padding: f64) -> f64 {
    let usable = volume_in3(usable_dims(d, padding).map(|v| v.max(0.0)));
    (usable - item_volume_in3).max(0.0)
}

/// Settings that the cost of an order depends on.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CostParams {
    pub carrier: CarrierPreset,
    pub rate_table: RateTable,
    pub padding_in: f64,
    pub void_fill_usd_per_ft3: f64,
}

impl CostParams {
    pub fn from_settings(s: &Settings) -> Self {
        Self {
            carrier: s.carrier,
            rate_table: s.rate_table,
            padding_in: s.padding_in,
            void_fill_usd_per_ft3: s.void_fill_usd_per_ft3,
        }
    }
}

/// Cost and metrics of shipping one order (items of `item_volume_in3`,
/// `item_weight_lb`) in a box with interior `d` and unit cost `unit_cost`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CostEval {
    pub billable_lb: f64,
    pub shipping_usd: f64,
    pub box_usd: f64,
    pub void_fill_usd: f64,
    /// Shipping + box + void fill: the cost the optimizer minimizes.
    pub total_usd: f64,
    pub empty_space_pct: f64,
    pub cardboard_lb: f64,
    pub shipped_ft3: f64,
    /// Interior volume not occupied by items (padding included).
    pub air_ft3: f64,
    /// Usable volume not occupied by items (to be filled with void fill).
    pub void_fill_ft3: f64,
    pub interior_in3: f64,
}

/// Evaluate one order in one box.
pub fn evaluate(
    item_volume_in3: f64,
    item_weight_lb: f64,
    d: Dims,
    unit_cost: f64,
    p: &CostParams,
) -> CostEval {
    let cardboard = box_weight_lb(d);
    let actual = item_weight_lb + cardboard;
    let billable = billable_lb(actual, dim_weight_lb(d, p.carrier));
    let shipping = shipping_usd(billable, &p.rate_table);
    let interior = volume_in3(d);
    let empty = if interior > 0.0 {
        (1.0 - item_volume_in3 / interior) * 100.0
    } else {
        0.0
    };
    let void_ft3 = void_fill_in3(item_volume_in3, d, p.padding_in) / 1728.0;
    let void_usd = void_ft3 * p.void_fill_usd_per_ft3;
    CostEval {
        billable_lb: billable,
        shipping_usd: shipping,
        box_usd: unit_cost,
        void_fill_usd: void_usd,
        total_usd: shipping + unit_cost + void_usd,
        empty_space_pct: empty,
        cardboard_lb: cardboard,
        shipped_ft3: interior / 1728.0,
        air_ft3: (interior - item_volume_in3).max(0.0) / 1728.0,
        void_fill_ft3: void_ft3,
        interior_in3: interior,
    }
}

impl CostEval {
    /// Convert to report metrics for a named box.
    pub fn to_metrics(&self, box_id: &str) -> BoxMetrics {
        BoxMetrics {
            box_id: box_id.to_string(),
            billable_lb: self.billable_lb,
            shipping_usd: self.shipping_usd,
            box_usd: self.box_usd,
            void_fill_usd: self.void_fill_usd,
            total_usd: self.total_usd,
            empty_space_pct: self.empty_space_pct,
            cardboard_lb: self.cardboard_lb,
            shipped_ft3: self.shipped_ft3,
            air_ft3: self.air_ft3,
            void_fill_ft3: self.void_fill_ft3,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn table() -> RateTable {
        RateTable {
            base_usd: RATE_BASE_USD,
            per_lb_usd: RATE_PER_LB_USD,
            max_lb: RATE_MAX_LB,
        }
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    #[test]
    fn billable_rounds_up_to_whole_pounds() {
        assert_eq!(billable_lb(1.01, 0.0), 2.0);
        assert_eq!(billable_lb(2.0, 0.0), 2.0);
        assert_eq!(billable_lb(2.0 + 1e-12, 0.0), 2.0);
        assert_eq!(billable_lb(0.2, 0.0), 1.0);
        assert_eq!(billable_lb(1.5, 3.2), 4.0);
    }

    #[test]
    fn ups_fedex_dim_weight_uses_139() {
        // 12×12×12 = 1728 in³ → 12.43 lb DIM → 13 lb billable.
        let d = dim_weight_lb([12.0, 12.0, 12.0], CarrierPreset::UpsFedex);
        assert!(close(d, 1728.0 / 139.0));
        assert_eq!(billable_lb(2.0, d), 13.0);
    }

    #[test]
    fn usps_dim_applies_only_above_one_cubic_foot() {
        assert_eq!(dim_weight_lb([12.0, 12.0, 12.0], CarrierPreset::Usps), 0.0);
        let d = dim_weight_lb([12.0, 12.0, 12.5], CarrierPreset::Usps);
        assert!(close(d, 1800.0 / 166.0));
    }

    #[test]
    fn box_weight_from_surface_area() {
        // 12×12×12: 864 in² = 6 ft² → 0.78 lb.
        assert!(close(box_weight_lb([12.0, 12.0, 12.0]), 6.0 * 0.13));
    }

    #[test]
    fn rate_table_is_linear_and_extends_past_max() {
        let t = table();
        assert!(close(shipping_usd(1.0, &t), 8.5));
        assert!(close(shipping_usd(3.0, &t), 8.5 + 2.0 * 0.95));
        assert!(close(shipping_usd(80.0, &t), 8.5 + 79.0 * 0.95));
    }

    #[test]
    fn stock_and_custom_unit_costs() {
        // 10×8×6: surface 2(80+60+48) = 376 in².
        assert!(close(
            stock_unit_cost([10.0, 8.0, 6.0]),
            0.20 + 0.0015 * 376.0
        ));
        assert!(close(
            custom_unit_cost([10.0, 8.0, 6.0]),
            (0.20 + 0.0015 * 376.0) * 1.25
        ));
    }

    #[test]
    fn evaluate_combines_everything() {
        let d = [10.0, 8.0, 6.0]; // 480 in³ → DIM 3.45 lb
        let p = CostParams {
            carrier: CarrierPreset::UpsFedex,
            rate_table: table(),
            padding_in: 0.5,
            void_fill_usd_per_ft3: 1.728,
        };
        let e = evaluate(240.0, 1.0, d, 1.10, &p);
        assert_eq!(e.billable_lb, 4.0);
        assert!(close(e.shipping_usd, 8.5 + 3.0 * 0.95));
        // Usable 9×7×5 = 315 in³, items 240 in³ → 75 in³ of void fill.
        assert!(close(e.void_fill_ft3, 75.0 / 1728.0));
        assert!(close(e.void_fill_usd, 75.0 / 1000.0));
        assert!(close(e.total_usd, e.shipping_usd + 1.10 + 0.075));
        assert!(close(e.empty_space_pct, 50.0));
        assert!(close(e.shipped_ft3, 480.0 / 1728.0));
        // Air counts all non-item interior space, padding included.
        assert!(close(e.air_ft3, 240.0 / 1728.0));
    }

    #[test]
    fn void_fill_is_never_negative_and_zero_cost_is_allowed() {
        assert_eq!(void_fill_in3(1000.0, [10.0, 8.0, 6.0], 0.5), 0.0);
        assert_eq!(void_fill_in3(1.0, [1.0, 1.0, 1.0], 1.0), 0.0);
        let p = CostParams {
            carrier: CarrierPreset::Usps,
            rate_table: table(),
            padding_in: 0.5,
            void_fill_usd_per_ft3: 0.0,
        };
        let e = evaluate(10.0, 0.5, [6.0, 6.0, 6.0], 0.5, &p);
        assert!(close(e.total_usd, e.shipping_usd + 0.5));
    }
}
