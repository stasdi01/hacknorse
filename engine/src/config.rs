//! All engine constants in one place.
//!
//! Mirrored in `web/src/engine/defaults.ts` (a web test checks they match).
//! Values marked ASSUMPTION must be verified by the team before presenting.

/// Default clearance per side for protective fill (inches).
pub const DEFAULT_PADDING_IN: f64 = 0.5; // ASSUMPTION: verify before presenting
/// Allowed padding range (inches).
pub const MIN_PADDING_IN: f64 = 0.0;
pub const MAX_PADDING_IN: f64 = 2.0;

/// Default number of box sizes in the detailed report.
pub const DEFAULT_K: u32 = 4;
/// Range of K for the slider and the K-curve.
pub const MIN_K: u32 = 1;
pub const MAX_K: u32 = 8;

/// DIM divisor, UPS/FedEx-style preset (in³ per lb).
pub const DIM_DIVISOR_UPS_FEDEX: f64 = 139.0; // ASSUMPTION: verify before presenting
/// DIM divisor, USPS-style preset (in³ per lb).
pub const DIM_DIVISOR_USPS: f64 = 166.0; // ASSUMPTION: verify before presenting
/// USPS-style: DIM weight applies only above this volume (1 ft³).
pub const USPS_DIM_MIN_VOLUME_IN3: f64 = 1728.0; // ASSUMPTION: verify before presenting

/// Illustrative rate table: price at 1 lb.
pub const RATE_BASE_USD: f64 = 8.50; // ASSUMPTION: verify before presenting (illustrative)
/// Illustrative rate table: price per extra lb.
pub const RATE_PER_LB_USD: f64 = 0.95; // ASSUMPTION: verify before presenting (illustrative)
/// Heaviest weight in the illustrative table (heavier is extrapolated).
pub const RATE_MAX_LB: f64 = 70.0; // ASSUMPTION: verify before presenting (illustrative)

/// Corrugated board weight, single-wall (lb per ft² of box surface).
pub const BOARD_WEIGHT_LB_PER_FT2: f64 = 0.13; // ASSUMPTION: verify before presenting

/// Stock box unit cost estimate: base + per in² of surface area (USD).
pub const STOCK_COST_BASE_USD: f64 = 0.20; // ASSUMPTION: verify before presenting
pub const STOCK_COST_PER_IN2_USD: f64 = 0.0015; // ASSUMPTION: verify before presenting
/// Void-fill material cost (air pillows / paper) per ft³ of void volume
/// (usable volume − item volume).
pub const VOID_FILL_USD_PER_FT3: f64 = 0.50; // ASSUMPTION: verify before presenting

/// Custom box unit cost = stock formula × this factor.
pub const CUSTOM_COST_MULTIPLIER: f64 = 1.25; // ASSUMPTION: verify before presenting

/// Orders with more items than this are excluded ("too large for MVP").
pub const MAX_ITEMS_PER_ORDER: u32 = 40;
/// Custom mode: dimensions are rounded up to this step (inches).
pub const CUSTOM_ROUND_STEP_IN: f64 = 0.5;
/// Custom mode: size of the container used to pack multi-item signatures.
pub const CUSTOM_CONTAINER_IN: f64 = 60.0;
/// Custom mode: maximum number of candidate boxes kept.
pub const MAX_CUSTOM_CANDIDATES: usize = 300;

/// Optimizer: maximum local-search (swap) rounds.
pub const LOCAL_SEARCH_MAX_ROUNDS: u32 = 50;
/// Optimizer: cost added per order of a signature that no selected box fits
/// (while some candidate fits it), so it must be served.
pub const UNSERVED_PENALTY_USD: f64 = 1.0e6;

/// Number of most frequent signatures with 3D placements in the report.
pub const PLACEMENTS_TOP_N: usize = 50;

/// Validation: size of the reduced candidate set for brute force.
pub const VALIDATE_TOP_CANDIDATES: usize = 25;
/// Validation: values of K checked by brute force.
pub const VALIDATE_KS: [u32; 2] = [2, 3];

/// Geometric tolerance for fit checks (inches).
pub const EPS: f64 = 1e-9;
