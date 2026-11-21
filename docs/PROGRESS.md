# Progress

| #   | Milestone                                           | Status  | Note |
| --- | --------------------------------------------------- | ------- | ---- |
| M0  | Scaffold + toolchain proof                          | done    | Rust `version()` → WASM → Web Worker → `/dev` page, verified in dev and prod with Playwright; CI workflow. |
| M1  | Types, config, stock catalog, sample data generator | done    | Rust/TS types + config with sync tests, 83-box stock catalog, deterministic Fern & Kiln sample (40 SKUs, 3,000 orders). |
| M2  | Packer                                              | done    | Exact single-item rule, two-pass extreme-point heuristic, (signature, box) cache; 4 proptest properties × 2000 cases. |
| M3  | Cost model + carrier presets                        | done    | Box weight, DIM (139 / 166 + USPS 1 ft³ rule), billable ceil, linear rate table, stock/custom cost estimates; unit tests. |
| M4  | Optimizer + baseline + K-curve (stock mode)         | done    | Pre-processing, p-median greedy + swap (multi-start), baseline, K-curve 1–8, report assembly. Sample store: 114 ms native release (target < 2 s), saves 8.2%. |
| M5  | WASM API end-to-end                                 | done    | optimize()/validate()/version() JSON API + progress stages; sample store optimized in the worker and shown as JSON on /dev (Playwright). |
| M6  | Data step: upload, mapping, validation, templates   | done    | Upload (drag/drop), templates, sample loader, synonym mapping UI with unit selects, validation report; e2e with renamed Shopify-style columns. |
| M7  | Results dashboard                                   | done    | Settings step (mode, K, padding, carrier, rate table, units) + KPI cards, before/after bars, clickable K-curve, box tables, paginated orders table, flagged panel. |
| M8  | 3D viewer                                           | done    | react-three-fiber side-by-side viewer (wireframe box, items colored by SKU, orbit controls) for any top-50 order; selectable from dropdown or orders table. |
| M9  | Export                                              | done    | Buying list CSV (yearly quantity per box), packing guide CSV (every order type → box), print-friendly report view for Save as PDF. |
| M10 | Landing page + design polish + units toggle         | done    | Landing page (hook, 3 placeholder facts, sample/own-data CTAs, how it works), kraft/green theme, units toggle; no horizontal scroll at 390 px. |
| M11 | Custom mode                                         | done    | Custom candidates (tight box per order type, compact/EP/near-cube layouts, 300 cap + coverage), UI mode toggle; sample custom run 242 ms native (target < 10 s). |
| M12 | Validation + /method page                           | done    | validate(): 25-candidate reduced instance, brute force over all 2- and 3-box sets; /method page (pipeline, p-median, packer, live validation: 0.00% gap, assumptions, privacy). |
| M13 | E2E + docs + local production check                 | done    | Playwright smoke (landing → sample → KPIs + 3D canvas) and 11 e2e tests pass on pnpm start and pnpm dev; README (run steps, Mermaid, screenshots, tests, assumptions, CI badge) and METHOD.md complete. |
| M14 | Model realism and headline metrics                  | done    | 170-size stock catalog (1-inch small steps), void-fill cost ($0.50/ft³, editable) in the optimized total, air shipped + void fill as primary KPIs, /method explanation; results table below. |
| S1  | AI column mapping                                   | skipped | Later, per PRD. |
| S2  | Python benchmark (stretch)                          | done    | bench/python_packer.py (pure-Python port) vs Rust on 80,427 sample fit checks: 100% agreement, Rust ≈ 55× faster; table in bench/README.md. |

## M14 results: sample store, K = 2…8

Sample store "Fern & Kiln" (unchanged), default settings: padding 0.5 in per side (unchanged),
UPS/FedEx-style DIM (divisor 139), illustrative rates ($8.50 at 1 lb + $0.95 per extra lb),
**void-fill cost $0.50 per ft³** of void (usable volume − item volume; an assumption to verify).
Before = each order in the cheapest of the 3 current boxes (8×8×8, 12×12×8, 16×12×12). All values
are per year, over the 2,991 orders per year that both box sets can ship. Cost savings are on
shipping + boxes + void fill. Air shipped = box interior volume − product volume (padding
included). Stock mode uses the 170-size catalog; custom mode designs up to 300 sizes.

| Mode   |   K | Cost savings | Air shipped ft³/yr (before → after) | Void fill ft³/yr (before → after) | Cardboard lb/yr (before → after) | Recommended boxes |
| ------ | --: | -----------: | ----------------------------------: | --------------------------------: | -------------------------------: | ----------------- |
| Stock  |   2 |       −17.9% |                 1,250 → 1,899 (+52%) |                 833 → 1,376 (+65%) |             1,447 → 1,792 (+24%) | S-12x9x6, S-15x15x15 |
| Stock  |   3 |         3.5% |                  1,250 → 1,201 (−4%) |                    833 → 794 (−5%) |              1,447 → 1,413 (−2%) | S-10x8x5, S-14x12x8, S-15x15x15 |
| Stock  |   4 |        11.4% |                   1,250 → 934 (−25%) |                   833 → 588 (−29%) |             1,447 → 1,209 (−16%) | S-9x6x5, S-12x9x6, S-14x12x8, S-15x15x15 |
| Stock  |   5 |        14.7% |                   1,250 → 822 (−34%) |                   833 → 492 (−41%) |             1,447 → 1,159 (−20%) | S-9x6x5, S-12x9x6, S-14x12x8, S-15x12x10, S-15x15x15 |
| Stock  |   6 |        16.8% |                   1,250 → 770 (−38%) |                   833 → 452 (−46%) |             1,447 → 1,120 (−23%) | S-9x6x5, S-11x8x6, S-11x11x8, S-15x12x6, S-15x12x10, S-15x15x15 |
| Stock  |   7 |        17.9% |                   1,250 → 723 (−42%) |                   833 → 412 (−51%) |             1,447 → 1,097 (−24%) | S-9x6x5, S-11x8x6, S-10x10x8, S-15x12x6, S-14x12x8, S-15x12x10, S-15x15x15 |
| Stock  |   8 |        18.9% |                   1,250 → 689 (−45%) |                   833 → 389 (−53%) |             1,447 → 1,061 (−27%) | S-8x4x4, S-9x6x5, S-11x8x6, S-10x10x8, S-15x12x6, S-14x12x8, S-15x12x10, S-15x15x15 |
| Custom |   2 |       −19.0% |                 1,250 → 1,875 (+50%) |                 833 → 1,339 (+61%) |             1,447 → 1,837 (+27%) | C-11.5x11.5x6, C-15x15x15 |
| Custom |   3 |         3.7% |                  1,250 → 1,155 (−8%) |                    833 → 756 (−9%) |              1,447 → 1,387 (−4%) | C-11.5x7x5, C-14x11.5x8.5, C-15x15x15 |
| Custom |   4 |        10.1% |                   1,250 → 911 (−27%) |                   833 → 573 (−31%) |             1,447 → 1,181 (−18%) | C-8x6.5x5, C-11x9x6, C-14x11.5x8.5, C-15x15x15 |
| Custom |   5 |        13.6% |                   1,250 → 808 (−35%) |                   833 → 479 (−42%) |             1,447 → 1,155 (−20%) | C-8x6.5x5, C-11.5x11.5x5, C-14x11x7, C-14x12x12, C-15x15x15 |
| Custom |   6 |        16.0% |                   1,250 → 732 (−41%) |                   833 → 421 (−50%) |             1,447 → 1,097 (−24%) | C-8x6.5x5, C-12x9x5, C-11.5x11.5x6, C-14x11x7, C-14x12x12, C-15x15x15 |
| Custom |   7 |        17.4% |                   1,250 → 675 (−46%) |                   833 → 378 (−55%) |             1,447 → 1,049 (−27%) | C-8x6.5x5, C-11.5x7x5, C-10x9x7, C-13x11.5x6.5, C-14x10x9, C-14x12x12, C-15x15x15 |
| Custom |   8 |        18.5% |                   1,250 → 650 (−48%) |                   833 → 357 (−57%) |             1,447 → 1,037 (−28%) | C-8x6.5x5, C-11.5x7x5, C-10x9x7, C-13x11.5x6.5, C-14x11x7, C-13.5x10x9, C-14x12x12, C-15x15x15 |

Notes:

- With K = 2 the recommended set is worse than the seller's 3 current boxes: two sizes cannot
  cover small and large orders well. From K = 3 on it is better on every metric.
- Custom sizes cost 1.25× the stock estimate. With the 170-size stock catalog, stock mode saves
  slightly more money than custom mode for K ≥ 4 (custom is ahead only at K = 3), while custom
  mode ships less air at every K.
- Brute-force validation (K = 2, 3 on 25 candidates) still shows a 0.00% gap in both modes.
