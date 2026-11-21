//! JSON types for the engine API.
//!
//! These types are mirrored exactly in `web/src/engine/types.ts`.
//! Any change here must be made there in the same commit.
//! All lengths are inches, weights pounds, money US dollars.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/// A product (SKU) with its packed dimensions and weight.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Product {
    pub sku: String,
    #[serde(default)]
    pub name: String,
    pub length_in: f64,
    pub width_in: f64,
    pub height_in: f64,
    pub weight_lb: f64,
}

/// One order line item.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OrderLine {
    pub order_id: String,
    pub sku: String,
    pub quantity: u32,
    /// Optional order date, `YYYY-MM-DD` (used to annualize totals).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
}

/// A box (interior dimensions).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BoxSpec {
    pub box_id: String,
    pub length_in: f64,
    pub width_in: f64,
    pub height_in: f64,
    pub unit_cost_usd: f64,
}

/// Candidate generation mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Mode {
    Stock,
    Custom,
}

/// Carrier DIM-weight preset.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CarrierPreset {
    /// Divisor 139, DIM always applies.
    UpsFedex,
    /// Divisor 166, DIM only when volume > 1728 in³.
    Usps,
}

/// Linear rate table: `base_usd` at 1 lb, plus `per_lb_usd` per extra lb.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct RateTable {
    pub base_usd: f64,
    pub per_lb_usd: f64,
    /// Heaviest weight in the table. Heavier parcels are priced by
    /// extending the line (labeled in the UI).
    pub max_lb: f64,
}

/// User settings.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Settings {
    pub mode: Mode,
    /// Number of box sizes for the detailed report (1–8).
    pub k: u32,
    pub padding_in: f64,
    pub carrier: CarrierPreset,
    pub rate_table: RateTable,
    /// Also allow the seller's current boxes as candidates.
    #[serde(default)]
    pub allow_current_boxes: bool,
}

/// Input to `optimize` and `validate`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OptimizeInput {
    pub products: Vec<Product>,
    pub orders: Vec<OrderLine>,
    #[serde(default)]
    pub current_boxes: Vec<BoxSpec>,
    pub settings: Settings,
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/// Error returned (as JSON) instead of a report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EngineError {
    pub error: String,
}

/// Where a box size comes from.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BoxSource {
    Stock,
    Custom,
    Current,
}

/// SKU and quantity within a signature.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SignatureItem {
    pub sku: String,
    pub quantity: u32,
}

/// How the dataset period was turned into "per year" numbers.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Annualization {
    /// Multiply dataset totals by this to get per-year totals.
    pub factor: f64,
    /// Days covered by order dates, if dates were given.
    pub period_days: Option<f64>,
    /// True when dates were missing and the dataset is treated as one year.
    pub assumed_one_year: bool,
}

/// Input statistics.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InputStats {
    pub line_items: u32,
    pub orders_total: u32,
    /// Orders included in the optimization.
    pub orders_used: u32,
    pub signatures: u32,
    /// Orders with more than the item cap (excluded).
    pub orders_too_large: u32,
    /// Line items skipped (unknown SKU, zero quantity).
    pub line_items_skipped: u32,
    pub candidates: u32,
}

/// Count-weighted, annualized totals for one scenario.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Totals {
    /// Orders per year included in these totals.
    pub orders: f64,
    pub shipping_usd: f64,
    pub box_usd: f64,
    pub total_usd: f64,
    /// 1 − Σ item volume / Σ interior volume.
    pub empty_space_pct: f64,
    pub cardboard_lb: f64,
    pub shipped_ft3: f64,
}

/// Baseline vs. optimized summary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Summary {
    /// Both scenarios are computed on the orders served by both, so they
    /// are comparable.
    pub baseline: Totals,
    pub optimized: Totals,
    pub savings_usd: f64,
    pub savings_pct: f64,
    pub cardboard_saved_lb: f64,
    pub shipped_ft3_saved: f64,
    /// Orders (per year) served by each scenario, and flagged.
    pub baseline_orders_served: f64,
    pub baseline_orders_flagged: f64,
    pub optimized_orders_served: f64,
    pub optimized_orders_flagged: f64,
}

/// One point of the "cost vs. number of box sizes" curve.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CurvePoint {
    pub k: u32,
    /// Annualized total $ over all orders served by the selection
    /// (excludes orders that fit no candidate).
    pub total_usd: f64,
    pub empty_space_pct: f64,
    pub box_ids: Vec<String>,
}

/// A recommended (or current) box with its usage.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BoxUsage {
    pub box_id: String,
    pub length_in: f64,
    pub width_in: f64,
    pub height_in: f64,
    pub unit_cost_usd: f64,
    pub source: BoxSource,
    /// Orders per year packed in this box.
    pub orders: f64,
    /// Share of served orders (0–100).
    pub orders_pct: f64,
}

/// Per-order metrics of a signature in one box.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BoxMetrics {
    pub box_id: String,
    pub billable_lb: f64,
    pub shipping_usd: f64,
    pub box_usd: f64,
    pub total_usd: f64,
    pub empty_space_pct: f64,
    pub cardboard_lb: f64,
    pub shipped_ft3: f64,
}

/// A signature with its baseline and optimized box.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Assignment {
    pub signature_id: u32,
    pub items: Vec<SignatureItem>,
    /// Orders in the dataset with this signature.
    pub count: u32,
    pub item_volume_in3: f64,
    pub item_weight_lb: f64,
    pub baseline: Option<BoxMetrics>,
    pub optimized: Option<BoxMetrics>,
}

/// One placed item (interior coordinates, inches; origin at a box corner).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Placement {
    pub sku: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub l: f64,
    pub w: f64,
    pub h: f64,
}

/// A packed box for the 3D viewer.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PackedBox {
    pub box_id: String,
    pub length_in: f64,
    pub width_in: f64,
    pub height_in: f64,
    pub items: Vec<Placement>,
}

/// Placements for one of the most frequent signatures.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SignaturePlacements {
    pub signature_id: u32,
    pub baseline: Option<PackedBox>,
    pub optimized: Option<PackedBox>,
}

/// Why a signature was flagged.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FlagReason {
    /// More items than the MVP cap.
    TooManyItems,
    /// Fits no candidate box at all (needs 2+ boxes).
    FitsNoCandidate,
    /// Fits none of the seller's current boxes.
    FitsNoCurrentBox,
}

/// A signature that could not be served.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Flagged {
    /// `None` for orders excluded before deduplication.
    pub signature_id: Option<u32>,
    pub order_ids: Vec<String>,
    pub items: Vec<SignatureItem>,
    pub count: u32,
    pub reason: FlagReason,
}

/// Wall-clock time per stage, milliseconds.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Timings {
    pub preprocess_ms: f64,
    pub candidates_ms: f64,
    pub fit_ms: f64,
    pub optimize_ms: f64,
    pub report_ms: f64,
    pub total_ms: f64,
}

/// Output of `optimize`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Report {
    pub engine_version: String,
    pub settings: Settings,
    pub annualization: Annualization,
    pub stats: InputStats,
    pub summary: Summary,
    pub curve: Vec<CurvePoint>,
    pub recommended: Vec<BoxUsage>,
    pub current: Vec<BoxUsage>,
    pub assignments: Vec<Assignment>,
    pub placements: Vec<SignaturePlacements>,
    pub flagged: Vec<Flagged>,
    pub timings_ms: Timings,
}

/// Brute force vs. heuristic for one K.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ValidationCase {
    pub k: u32,
    pub combinations: u64,
    pub optimal_usd: f64,
    pub heuristic_usd: f64,
    pub gap_pct: f64,
    pub brute_force_ms: f64,
    pub heuristic_ms: f64,
}

/// Output of `validate`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ValidationReport {
    pub engine_version: String,
    pub candidates_used: u32,
    pub signatures: u32,
    pub cases: Vec<ValidationCase>,
}
