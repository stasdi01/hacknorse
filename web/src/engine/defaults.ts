/**
 * All engine constants, mirrored from `engine/src/config.rs`
 * (`defaults.test.ts` checks that the values match).
 * Values marked ASSUMPTION must be verified by the team before presenting.
 */
import type { Settings } from "./types";

/** Default clearance per side for protective fill (inches). */
export const DEFAULT_PADDING_IN = 0.5; // ASSUMPTION: verify before presenting
export const MIN_PADDING_IN = 0.0;
export const MAX_PADDING_IN = 2.0;

export const DEFAULT_K = 4;
export const MIN_K = 1;
export const MAX_K = 8;

/** DIM divisor, UPS/FedEx-style preset (in³ per lb). */
export const DIM_DIVISOR_UPS_FEDEX = 139.0; // ASSUMPTION: verify before presenting
/** DIM divisor, USPS-style preset (in³ per lb). */
export const DIM_DIVISOR_USPS = 166.0; // ASSUMPTION: verify before presenting
/** USPS-style: DIM weight applies only above this volume (1 ft³). */
export const USPS_DIM_MIN_VOLUME_IN3 = 1728.0; // ASSUMPTION: verify before presenting

/** Illustrative rate table. */
export const RATE_BASE_USD = 8.5; // ASSUMPTION: verify before presenting (illustrative)
export const RATE_PER_LB_USD = 0.95; // ASSUMPTION: verify before presenting (illustrative)
export const RATE_MAX_LB = 70.0; // ASSUMPTION: verify before presenting (illustrative)

/** Corrugated board weight, single-wall (lb per ft²). */
export const BOARD_WEIGHT_LB_PER_FT2 = 0.13; // ASSUMPTION: verify before presenting

/** Stock box unit cost estimate: base + per in² of surface area (USD). */
export const STOCK_COST_BASE_USD = 0.2; // ASSUMPTION: verify before presenting
export const STOCK_COST_PER_IN2_USD = 0.0015; // ASSUMPTION: verify before presenting
/** Void-fill material cost (air pillows / paper) per ft³ of void volume. */
export const VOID_FILL_USD_PER_FT3 = 0.5; // ASSUMPTION: verify before presenting

/** Custom box unit cost = stock formula × this factor. */
export const CUSTOM_COST_MULTIPLIER = 1.25; // ASSUMPTION: verify before presenting

export const MAX_ITEMS_PER_ORDER = 40;
export const CUSTOM_ROUND_STEP_IN = 0.5;
export const CUSTOM_CONTAINER_IN = 60.0;
export const MAX_CUSTOM_CANDIDATES = 300;

export const LOCAL_SEARCH_MAX_ROUNDS = 50;
export const UNSERVED_PENALTY_USD = 1.0e6;
export const PLACEMENTS_TOP_N = 50;
export const VALIDATE_TOP_CANDIDATES = 25;
export const VALIDATE_KS = [2, 3] as const;
export const EPS = 1e-9;

/** Default user settings. */
export const DEFAULT_SETTINGS: Settings = {
  mode: "stock",
  k: DEFAULT_K,
  padding_in: DEFAULT_PADDING_IN,
  carrier: "ups_fedex",
  rate_table: {
    base_usd: RATE_BASE_USD,
    per_lb_usd: RATE_PER_LB_USD,
    max_lb: RATE_MAX_LB,
  },
  allow_current_boxes: false,
  void_fill_usd_per_ft3: VOID_FILL_USD_PER_FT3,
};

/** Stock box unit cost estimate (USD) from interior dims (inches). */
export function stockUnitCost(l: number, w: number, h: number): number {
  const surface = 2 * (l * w + l * h + w * h);
  return STOCK_COST_BASE_USD + STOCK_COST_PER_IN2_USD * surface;
}
