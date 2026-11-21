# HackNorse 2026 — Box-Set Optimizer: Product Requirements Document

**Working title:** Box Optimizer (final name to be decided later; stored in one constant)
**Hook:** Stop shipping air.
**Track:** Sustainability
**One sentence:** The app designs the best set of shipping box sizes for a small online store, using the store's own order history, so it ships less air, uses less cardboard and pays less for shipping.

---

## 1. Problem

- Small online sellers buy shipping boxes by guesswork (often 2–4 sizes). Many orders end up in boxes that are much larger than the items inside.
- Oversized boxes waste cardboard and void fill, waste truck space (more trips, more emissions), and cost money, because carriers charge by **dimensional (DIM) weight**: package size, not only actual weight.
- Existing tools for small sellers (Shopify apps such as BoxPick, Box Smart, BoxPack IQ) only **pick the best box from the boxes the seller already owns**. They do not tell the seller **which box sizes to buy**. Box-set ("assortment") optimization exists for large warehouses (enterprise vendors), not for small sellers.

## 2. Our one thing better

The app **designs the box set**. Given order history, it chooses the K box sizes (from a stock catalog, or fully custom sizes) that minimize total shipping + box cost across all orders, and shows the before/after.

Important framing: our "before" baseline already gives every order the best of the seller's current boxes, which is exactly what box-picker apps do. So our savings are **on top of** what competitors achieve.

## 3. Users

- **Primary:** small e-commerce sellers (1–50 people) who pack their own orders (Shopify, Etsy, WooCommerce, etc.).
- **Secondary (roadmap):** small 3PL warehouses.

## 4. Goals and non-goals

**Goals (MVP)**

1. Recommend the best K box sizes (K = 1–8) from (a) a stock catalog and (b) custom sizes.
2. Show a clear before/after: empty space %, shipping $ per year, cardboard used, shipped volume.
3. Assign every order to a box and show it in 3D.
4. Run 100% in the browser. Order data never leaves the user's computer. No server, no database.
5. Be explainable: show the method and a validation against brute force.

**Non-goals (MVP)**

- Deployment/hosting setup (the team deploys later).
- Live carrier rate APIs, label printing, store integrations (Shopify app = roadmap).
- Splitting one order into multiple boxes (orders that fit no box are flagged instead).
- User accounts, database, payments.
- Fragile/"this side up" constraints (roadmap).

## 5. Definitions

- **Signature:** an order's multiset of items (SKU → quantity). Identical signatures are deduplicated and given a count.
- **Interior dims:** box inside dimensions (L × W × H, inches). Catalog dims are interior dims.
- **Padding:** clearance per side for protective fill (default 0.5 in). Usable space = interior − 2 × padding on each axis.
- **DIM weight:** L × W × H / divisor (lb). **Billable weight** = max(actual weight, DIM weight), rounded **up** to the next whole lb.
- **Baseline:** each order shipped in the cheapest fitting box among the seller's _current_ boxes.

## 6. Inputs (CSV)

All internal units: **inches** and **pounds**. The UI offers a metric display toggle (convert on input and display only).

**products.csv** (required)

```
sku,name,length_in,width_in,height_in,weight_lb
CND-08,Amber Candle 8oz,3.2,3.2,3.6,0.9
```

**orders.csv** (required, one row per line item)

```
order_id,sku,quantity
10001,CND-08,2
10001,MUG-12,1
```

**current_boxes.csv** (optional; if missing, the user can type boxes in the UI; the sample store includes 3)

```
box_id,length_in,width_in,height_in,unit_cost_usd
A,10,8,6,1.10
```

**Column mapping:** users' exports have different column names. Map columns with a built-in heuristic (normalized names + synonym list, e.g. "Lineitem sku" → sku, "Lineitem quantity" → quantity, "Name" → order_id). Show a mapping screen the user can correct. (AI-suggested mapping is a later feature, S1.)

**Validation:** list problems clearly (missing dimensions, unknown SKU in orders, non-positive numbers, duplicate SKUs). Allow continuing by skipping bad rows, with a count shown.

## 7. Settings (UI)

| Setting               | Default           | Notes                                                                                                                 |
| --------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Mode                  | Stock catalog     | Toggle: Stock / Custom (Custom = advanced)                                                                            |
| Number of box sizes K | 4                 | Slider 1–8; the K-curve shows all values                                                                              |
| Padding per side      | 0.5 in            | 0–2 in                                                                                                                |
| Carrier preset        | "UPS/FedEx-style" | Divisor 139. "USPS-style": divisor 166, DIM applied only if volume > 1728 in³ (1 ft³)                                 |
| Rate table            | Illustrative      | Editable: base $8.50 at 1 lb, +$0.95 per extra lb (to 70 lb). Clearly labeled "illustrative, replace with your rates" |
| Units display         | Imperial          | Toggle to metric                                                                                                      |

All constants live in one config file (`engine/src/config.rs`, mirrored in `web/src/engine/defaults.ts`) with a comment `// ASSUMPTION: verify before presenting` where relevant.

The app's display name lives in one constant: `web/src/config/app.ts` → `APP_NAME = "Box Optimizer"`. Never hard-code the name anywhere else.

## 8. Engine specification (Rust → WebAssembly)

### 8.1 Pre-processing

- Expand line items by quantity into items. Look up dims/weight by SKU.
- Deduplicate orders into signatures with counts.
- Flag orders with > 40 items as "too large for MVP" (excluded, counted in report).

### 8.2 Candidate boxes

- **Stock mode:** `engine/data/stock_boxes.json`, about 80 common stock corrugated sizes: cubes from 4 to 24 in (every 2 in), plus common rectangles (e.g. 6×4×4, 8×6×4, 9×6×3, 10×8×4, 10×8×6, 12×9×3, 12×9×6, 12×10×8, 14×10×4, 14×10×8, 16×12×4, 16×12×8, 18×12×6, 18×14×10, 20×14×6, 20×16×12, 24×16×8, 24×18×6, and similar).
  Unit cost ESTIMATE: `0.20 + 0.0015 × surface_area_in²` (USD). Labeled as an estimate in the UI.
- **Custom mode:** for each signature, compute a tight box:
  - Single item: sorted item dims + 2 × padding, rounded **up** to 0.5 in.
  - Multi item: pack into a large container (60×60×60) with a "compact" placement rule, take the bounding box of the placement, add padding, round up to 0.5 in.
  - Deduplicate. If there are more than 300 candidates, keep the 300 that serve the most order volume (count-weighted).
  - Custom unit cost ESTIMATE: stock formula × 1.25. UI note: "custom sizes usually need a minimum order quantity."
- The seller's current boxes are always evaluated for the baseline (not as candidates unless the user ticks "allow keeping my current sizes").

### 8.3 Packer: `fits(signature, box, padding) -> Option<Vec<Placement>>`

- Usable dims = interior − 2 × padding.
- Fast rejects: total item volume > usable volume; any item's sorted dims do not fit the sorted usable dims.
- **Single item: exact.** Fits iff sorted item dims ≤ sorted usable dims (element-wise).
- **Multi item: extreme-point heuristic** (Crainic, Perboli & Tadei, 2008, simplified):
  - Order items by volume descending (tie: longest side). Extreme points start at {(0,0,0)}.
  - For each item, try extreme points sorted by (z, y, x), and all 6 orientations. Place at the first position that is inside bounds and does not overlap any placed item.
  - After placing at (x, y, z) with size (l, w, h), add points (x+l, y, z), (x, y+w, z), (x, y, z+h).
  - If any item cannot be placed, the attempt fails. Run a second attempt with items ordered by longest side descending. Fits if either attempt succeeds.
- The heuristic is conservative: it may say "no" for a feasible packing, but never "yes" for an infeasible one.
- Cache results per (signature id, box id).

### 8.4 Cost model (per signature × box)

- Box weight (lb) = surface area (ft²) × board weight, default **0.13 lb/ft²** (≈ 0.63 kg/m², single-wall). ASSUMPTION.
- Actual weight = items + box weight. DIM weight per carrier preset. Billable = ceil(max(actual, DIM)).
- Shipping $ = rate table(billable). Total $ = shipping + box unit cost.
- Metrics: empty space % = 1 − item volume / interior volume; cardboard (lb) = box weight; shipped volume (ft³) = interior volume / 1728.
- All totals are count-weighted. Annualize: if order dates are missing, treat the dataset as one year and label it that way.

### 8.5 Optimizer: choose K boxes (p-median / facility-location)

- Precompute fit and cost matrices: signatures × candidates.
- Objective: minimize Σ count(o) × min over selected fitting boxes of total $(o, b). A signature with no fitting selected box adds a large penalty (it must be served whenever any candidate fits it).
- Algorithm: **greedy** (add the box with the largest objective decrease, K times), then **local search** (try swapping each selected box with each unselected box; accept improvements; repeat until no improvement or 50 rounds). Deterministic.
- Run for K = 1..8 to build the "savings vs. number of box sizes" curve. Report the user's chosen K in detail.
- Signatures that fit no candidate at all → "needs 2+ boxes" (excluded, counted, listed).

### 8.6 Baseline

- Assign each signature to the cheapest fitting current box (= box-picker app behavior). Signatures that fit no current box → flagged in the baseline.
- Report baseline vs. optimized for every metric.

### 8.7 Validation (for the /method page)

- `validate(input)`: build a reduced instance (top 25 candidates by usage in the greedy solution and its neighbors, K = 2 and 3), run **brute force** over all combinations, and report the optimal objective, the greedy+local-search objective, the gap % and run times.

### 8.8 WebAssembly API

- `optimize(input_json: string) -> string` (report JSON)
- `validate(input_json: string) -> string` (validation JSON)
- `version() -> string`
- The input/output JSON types are mirrored exactly in `web/src/engine/types.ts`. Called inside a Web Worker. The UI shows stage text ("Deduplicating orders…", "Checking fits…", "Optimizing…").

### 8.9 Report JSON (main fields)

- `summary`: baseline vs. optimized totals (shipping $, box $, total $, empty space %, cardboard lb, shipped ft³, orders served/flagged), savings $ and %.
- `curve`: for K = 1..8 → total $, empty space %, the boxes chosen.
- `recommended`: boxes for the chosen K, each with dims, unit cost, orders covered (count and %).
- `assignments`: signature → (baseline box, optimized box, per-order metrics).
- `placements`: for the 50 most frequent signatures, item placements in the baseline box and in the optimized box (for the 3D viewer).
- `flagged`: signatures that fit no box, with reason.
- `timings_ms` per stage, `engine_version`.

### 8.10 Performance targets (laptop)

- Sample store, stock mode: < 2 s. Custom mode: < 10 s.

## 9. UI specification (Next.js)

**Style:** light theme; kraft-cardboard brown (#B08D57-ish) + green accent; Inter font; large numbers; calm and professional. shadcn/ui components. Responsive, designed for a laptop screen. The app name always comes from `APP_NAME`.

**Pages**

1. `/` Landing: hook ("You're paying to ship air"), 3 short facts with sources (placeholders the team will fill), a button **"Try with a sample store"** (goes straight to results), and "Use my data."
2. `/app` Single-page flow:
   - **Step 1 – Data:** upload products.csv, orders.csv, optional current_boxes.csv; download templates; or "Load sample store."
   - **Step 2 – Map columns & validate:** mapping table + validation report.
   - **Step 3 – Settings:** see Section 7.
   - **Step 4 – Results dashboard:**
     - KPI cards: empty space before → after; $ saved per year; cardboard saved; shipped volume saved.
     - Before/after bar chart (Recharts).
     - K-curve: total $ vs. K, with the chosen K highlighted.
     - Recommended boxes table (dims, unit cost, % of orders).
     - **3D viewer** (react-three-fiber): pick an order → side by side, the current box vs. the recommended box, items colored by SKU, box as a transparent wireframe, orbit controls.
     - Orders table (paginated): order signature, baseline box, recommended box, empty space before/after.
     - Flagged orders panel.
   - **Export:** buying list CSV (box sizes + suggested quantities = count of orders per box per year), packing guide CSV (signature → box), and a print-friendly report page (browser "Save as PDF").
3. `/method`: how it works (pipeline diagram, p-median explanation in plain words, packer explanation), the validation results (run `validate()` on the sample store), assumptions table (every constant and its source/status), privacy note ("runs in your browser").

## 10. Sample store (synthetic, seeded)

- Script `scripts/generate-sample.ts` (deterministic seed) writes `web/public/sample/products.csv`, `orders.csv`, `current_boxes.csv`.
- Store: "Fern & Kiln", candles and ceramics, about 40 SKUs (candles 3 sizes, mugs, bowls, plates, vases, planters, gift sets, matches, wick trimmers…) with realistic dims and weights.
- About 3,000 orders over 12 months. Items per order: 1 (55%), 2 (25%), 3 (12%), 4–6 (8%). Some popular combos (e.g. candle + matches, mug pair).
- Current boxes: 3 sizes chosen "by guesswork": 8×8×8, 12×12×8, 16×12×12.
- Clearly labeled "synthetic sample data" in the UI.

## 11. Tech stack and architecture

| Layer             | Choice                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine            | Rust (stable), wasm-bindgen, serde/serde_json, built with wasm-pack `--target web`                                                                          |
| Engine tests      | `cargo test`, proptest (property tests)                                                                                                                     |
| Web               | Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui                                                                                                |
| Worker            | Web Worker loading the WASM module (Comlink optional)                                                                                                       |
| 3D                | three, @react-three/fiber, @react-three/drei                                                                                                                |
| Charts            | Recharts                                                                                                                                                    |
| CSV               | Papa Parse                                                                                                                                                  |
| Web tests         | Vitest (parsing, mapping, units), Playwright (end-to-end smoke)                                                                                             |
| CI                | GitHub Actions: cargo fmt check, clippy, cargo test, pnpm lint, pnpm test, pnpm build                                                                       |
| Hosting           | Not part of this build. The team deploys to Vercel later (Root Directory = `web`). The app must run locally with `pnpm dev` and `pnpm build && pnpm start`. |
| AI column mapping | Later (S1), not part of this build                                                                                                                          |

**Repo layout**

```
hacknorse/
  CLAUDE.md
  README.md
  /engine            Rust crate (lib + wasm bindings)
    /src             lib.rs, types.rs, config.rs, packer.rs, cost.rs,
                     candidates.rs, optimizer.rs, baseline.rs, validate.rs
    /data            stock_boxes.json
    /tests           integration + property tests
  /web               Next.js app
    /src/config      app.ts (APP_NAME)
    /src/engine      types.ts, defaults.ts, worker.ts, client.ts
    /src/engine-wasm built WASM package (committed, generated by wasm-pack)
    /public/sample   sample CSVs
  /scripts           generate-sample.ts, build-wasm.sh
  /docs              PRD.md, PROGRESS.md, DECISIONS.md, METHOD.md
```

**Build:** `scripts/build-wasm.sh` runs wasm-pack and outputs to `web/src/engine-wasm/`. The output is **committed**, so a future deploy only needs to build Next.js.

## 12. Quality requirements

- Packer property tests: for random items/boxes, every successful placement is inside bounds, has no overlaps and uses valid orientations. Single-item results match the exact rule.
- Optimizer tests: on tiny instances, greedy+swap equals brute force; the K-curve is non-increasing in total $ (more sizes never cost more).
- Cost tests: DIM rounding, USPS 1 ft³ rule, box weight.
- Web tests: CSV mapping heuristic, unit conversion, validation messages.
- Playwright smoke: landing → "Try with a sample store" → results visible with KPI cards and the 3D viewer canvas.
- README: what it is, screenshots, **how to run locally (step by step)**, architecture diagram (Mermaid), algorithm summary, test commands, assumptions, CI badge.

## 13. Milestones (build in this order; each ends with tests passing, commit and push)

| #   | Milestone                                           | Done when                                                                                                                                    |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Scaffold + toolchain proof                          | Next.js app, Rust crate, `version()` called from a Web Worker and shown on a dev page; CI workflow; README skeleton; PROGRESS/DECISIONS docs |
| M1  | Types, config, stock catalog, sample data generator | Shared types (Rust + TS), APP_NAME constant, stock_boxes.json, sample CSVs generated and committed                                           |
| M2  | Packer                                              | Exact single-item, extreme-point multi-item, caching, property tests pass                                                                    |
| M3  | Cost model + carrier presets                        | Tests pass                                                                                                                                   |
| M4  | Optimizer + baseline + K-curve (stock mode)         | Tests pass; sample store meets the performance target in a native test                                                                       |
| M5  | WASM API end-to-end                                 | `optimize()` runs in the worker on the sample store; JSON shown on the dev page                                                              |
| M6  | Data step: upload, mapping, validation, templates   | Works with the sample CSVs and with renamed columns                                                                                          |
| M7  | Results dashboard                                   | KPI cards, before/after chart, K-curve, box table, orders table, flagged panel                                                               |
| M8  | 3D viewer                                           | Before vs. after for any of the top 50 orders                                                                                                |
| M9  | Export                                              | Buying list CSV, packing guide CSV, print report page                                                                                        |
| M10 | Landing page + design polish + units toggle         | Matches the style section; responsive                                                                                                        |
| M11 | Custom mode                                         | Candidate generator + UI toggle; performance target met                                                                                      |
| M12 | Validation + /method page                           | Brute-force comparison shown with the gap %                                                                                                  |
| M13 | E2E + docs + local production check                 | Playwright smoke passes; README complete; `pnpm build && pnpm start` works locally                                                           |
| M14 | Model realism and headline metrics                  | ~150–200 stock sizes; void-fill cost in the optimized total; air shipped and void fill as primary KPIs; sample results table for K = 2…8   |
| S1  | (LATER — skip in this build) AI column mapping      | —                                                                                                                                            |
| S2  | (Stretch) Python benchmark                          | `bench/python_packer.py` + `bench/README.md` comparing the same fit checks; results table                                                    |

### M14 — Model realism and headline metrics

1. **Stock catalog realism:** expand `engine/data/stock_boxes.json` to about 150–200 common
   standard corrugated sizes, with 1-inch steps for small boxes (e.g. 4×4×4, 5×5×5, 6×4×4, 6×6×4,
   7×5×5, 7×7×7, 8×6×4, 8×6×6, 9×9×9 …) plus the larger sizes already listed. Keep the price
   formula.
2. **Void fill cost:** add a void-fill material cost per cubic foot to the cost model
   (void volume = usable volume − item volume). It lives in `config.rs` and `defaults.ts`
   (marked `// ASSUMPTION: verify before presenting`), is editable in Settings, and is part of the
   total cost the optimizer minimizes.
3. **Headline metrics:** the primary KPI cards are "Air shipped per year (ft³): before → after
   (−X%)" and "Void fill needed per year: before → after", next to $ saved and cardboard saved.
   Empty space % stays as a secondary metric. `/method` explains why padding counts as empty space
   and why air volume is the better measure.
4. **Results table:** re-run the sample store and record in `docs/PROGRESS.md`, for K = 2…8 in
   stock and custom mode: cost savings %, air shipped before/after, void fill before/after and
   cardboard before/after, plus the void-fill cost value used. The sample data and the padding
   default are not changed.

## 14. Risks and fallbacks

| Risk                                          | Fallback                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rust/WASM toolchain fails                     | After 3 distinct fix attempts on the same problem, port the engine to TypeScript (`web/src/engine/ts/`) with the same JSON API; log it in DECISIONS.md |
| Slow on large inputs                          | Dedupe, fast rejects, caching, candidate cap (300), cap 40 items/order                                                                                 |
| Heuristic misses feasible multi-item packings | It is conservative (never wrong "yes"); documented on /method                                                                                          |
| Illustrative rates differ from real ones      | Editable rate table; labeled clearly                                                                                                                   |

## 15. Assumptions to verify before the presentation (team, not Claude Code)

- Carrier DIM divisors (139 / 166) and the USPS 1 ft³ rule.
- Board weight 0.13 lb/ft².
- Stock box price formula vs. a real supplier's price list.
- All facts on the landing page and slides.

## 16. Roadmap (for the timeline slide)

1. Shopify/WooCommerce app: import orders automatically; push "which box" per order.
2. Real carrier rate cards (upload or API).
3. Fragile / "this side up" constraints, multi-box splitting.
4. Supplier links: one-click order of the recommended boxes; custom-box quotes.
5. Small 3PL version: multi-client, re-optimize each season.
