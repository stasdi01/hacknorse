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
| M12 | Validation + /method page                           | pending |      |
| M13 | E2E + docs + local production check                 | pending |      |
| S1  | AI column mapping                                   | skipped | Later, per PRD. |
| S2  | Python benchmark (stretch)                          | pending |      |
