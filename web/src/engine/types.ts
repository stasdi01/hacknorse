/**
 * JSON types for the engine API.
 *
 * Mirrors `engine/src/types.rs` exactly. Any change here must be made there
 * in the same commit. All lengths are inches, weights pounds, money US dollars.
 */

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** A product (SKU) with its packed dimensions and weight. */
export interface Product {
  sku: string;
  name: string;
  length_in: number;
  width_in: number;
  height_in: number;
  weight_lb: number;
}

/** One order line item. */
export interface OrderLine {
  order_id: string;
  sku: string;
  quantity: number;
  /** Optional order date, `YYYY-MM-DD` (used to annualize totals). */
  date?: string;
}

/** A box (interior dimensions). */
export interface BoxSpec {
  box_id: string;
  length_in: number;
  width_in: number;
  height_in: number;
  unit_cost_usd: number;
}

/** Candidate generation mode. */
export type Mode = "stock" | "custom";

/** Carrier DIM-weight preset. */
export type CarrierPreset = "ups_fedex" | "usps";

/** Linear rate table: `base_usd` at 1 lb, plus `per_lb_usd` per extra lb. */
export interface RateTable {
  base_usd: number;
  per_lb_usd: number;
  /** Heaviest weight in the table. Heavier parcels are priced by extending the line. */
  max_lb: number;
}

/** User settings. */
export interface Settings {
  mode: Mode;
  /** Number of box sizes for the detailed report (1–8). */
  k: number;
  padding_in: number;
  carrier: CarrierPreset;
  rate_table: RateTable;
  /** Also allow the seller's current boxes as candidates. */
  allow_current_boxes: boolean;
}

/** Input to `optimize` and `validate`. */
export interface OptimizeInput {
  products: Product[];
  orders: OrderLine[];
  current_boxes: BoxSpec[];
  settings: Settings;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** Error returned (as JSON) instead of a report. */
export interface EngineError {
  error: string;
}

/** Where a box size comes from. */
export type BoxSource = "stock" | "custom" | "current";

/** SKU and quantity within a signature. */
export interface SignatureItem {
  sku: string;
  quantity: number;
}

/** How the dataset period was turned into "per year" numbers. */
export interface Annualization {
  /** Multiply dataset totals by this to get per-year totals. */
  factor: number;
  /** Days covered by order dates, if dates were given. */
  period_days: number | null;
  /** True when dates were missing and the dataset is treated as one year. */
  assumed_one_year: boolean;
}

/** Input statistics. */
export interface InputStats {
  line_items: number;
  orders_total: number;
  /** Orders included in the optimization. */
  orders_used: number;
  signatures: number;
  /** Orders with more than the item cap (excluded). */
  orders_too_large: number;
  /** Line items skipped (unknown SKU, zero quantity). */
  line_items_skipped: number;
  candidates: number;
}

/** Count-weighted, annualized totals for one scenario. */
export interface Totals {
  /** Orders per year included in these totals. */
  orders: number;
  shipping_usd: number;
  box_usd: number;
  total_usd: number;
  /** 1 − Σ item volume / Σ interior volume. */
  empty_space_pct: number;
  cardboard_lb: number;
  shipped_ft3: number;
}

/** Baseline vs. optimized summary. */
export interface Summary {
  /** Both scenarios are computed on the orders served by both, so they are comparable. */
  baseline: Totals;
  optimized: Totals;
  savings_usd: number;
  savings_pct: number;
  cardboard_saved_lb: number;
  shipped_ft3_saved: number;
  /** Orders (per year) served by each scenario, and flagged. */
  baseline_orders_served: number;
  baseline_orders_flagged: number;
  optimized_orders_served: number;
  optimized_orders_flagged: number;
}

/** One point of the "cost vs. number of box sizes" curve. */
export interface CurvePoint {
  k: number;
  /** Annualized total $ over all orders served by the selection. */
  total_usd: number;
  empty_space_pct: number;
  box_ids: string[];
}

/** A recommended (or current) box with its usage. */
export interface BoxUsage {
  box_id: string;
  length_in: number;
  width_in: number;
  height_in: number;
  unit_cost_usd: number;
  source: BoxSource;
  /** Orders per year packed in this box. */
  orders: number;
  /** Share of served orders (0–100). */
  orders_pct: number;
}

/** Per-order metrics of a signature in one box. */
export interface BoxMetrics {
  box_id: string;
  billable_lb: number;
  shipping_usd: number;
  box_usd: number;
  total_usd: number;
  empty_space_pct: number;
  cardboard_lb: number;
  shipped_ft3: number;
}

/** A signature with its baseline and optimized box. */
export interface Assignment {
  signature_id: number;
  items: SignatureItem[];
  /** Orders in the dataset with this signature. */
  count: number;
  item_volume_in3: number;
  item_weight_lb: number;
  baseline: BoxMetrics | null;
  optimized: BoxMetrics | null;
}

/** One placed item (interior coordinates, inches; origin at a box corner). */
export interface Placement {
  sku: string;
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
}

/** A packed box for the 3D viewer. */
export interface PackedBox {
  box_id: string;
  length_in: number;
  width_in: number;
  height_in: number;
  items: Placement[];
}

/** Placements for one of the most frequent signatures. */
export interface SignaturePlacements {
  signature_id: number;
  baseline: PackedBox | null;
  optimized: PackedBox | null;
}

/** Why a signature was flagged. */
export type FlagReason = "too_many_items" | "fits_no_candidate" | "fits_no_current_box";

/** A signature that could not be served. */
export interface Flagged {
  /** `null` for orders excluded before deduplication. */
  signature_id: number | null;
  order_ids: string[];
  items: SignatureItem[];
  count: number;
  reason: FlagReason;
}

/** Wall-clock time per stage, milliseconds. */
export interface Timings {
  preprocess_ms: number;
  candidates_ms: number;
  fit_ms: number;
  optimize_ms: number;
  report_ms: number;
  total_ms: number;
}

/** Output of `optimize`. */
export interface Report {
  engine_version: string;
  settings: Settings;
  annualization: Annualization;
  stats: InputStats;
  summary: Summary;
  curve: CurvePoint[];
  recommended: BoxUsage[];
  current: BoxUsage[];
  assignments: Assignment[];
  placements: SignaturePlacements[];
  flagged: Flagged[];
  timings_ms: Timings;
}

/** Brute force vs. heuristic for one K. */
export interface ValidationCase {
  k: number;
  combinations: number;
  optimal_usd: number;
  heuristic_usd: number;
  gap_pct: number;
  brute_force_ms: number;
  heuristic_ms: number;
}

/** Output of `validate`. */
export interface ValidationReport {
  engine_version: string;
  candidates_used: number;
  signatures: number;
  cases: ValidationCase[];
}
