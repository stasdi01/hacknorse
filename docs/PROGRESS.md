# Progress

| #   | Milestone                                           | Status  | Note |
| --- | --------------------------------------------------- | ------- | ---- |
| M0  | Scaffold + toolchain proof                          | done    | Rust `version()` → WASM → Web Worker → `/dev` page, verified in dev and prod with Playwright; CI workflow. |
| M1  | Types, config, stock catalog, sample data generator | done    | Rust/TS types + config with sync tests, 83-box stock catalog, deterministic Fern & Kiln sample (40 SKUs, 3,000 orders). |
| M2  | Packer                                              | done    | Exact single-item rule, two-pass extreme-point heuristic, (signature, box) cache; 4 proptest properties × 2000 cases. |
| M3  | Cost model + carrier presets                        | done    | Box weight, DIM (139 / 166 + USPS 1 ft³ rule), billable ceil, linear rate table, stock/custom cost estimates; unit tests. |
| M4  | Optimizer + baseline + K-curve (stock mode)         | done    | Pre-processing, p-median greedy + swap (multi-start), baseline, K-curve 1–8, report assembly. Sample store: 114 ms native release (target < 2 s), saves 8.2%. |
| M5  | WASM API end-to-end                                 | pending |      |
| M6  | Data step: upload, mapping, validation, templates   | pending |      |
| M7  | Results dashboard                                   | pending |      |
| M8  | 3D viewer                                           | pending |      |
| M9  | Export                                              | pending |      |
| M10 | Landing page + design polish + units toggle         | pending |      |
| M11 | Custom mode                                         | pending |      |
| M12 | Validation + /method page                           | pending |      |
| M13 | E2E + docs + local production check                 | pending |      |
| S1  | AI column mapping                                   | skipped | Later, per PRD. |
| S2  | Python benchmark (stretch)                          | pending |      |
