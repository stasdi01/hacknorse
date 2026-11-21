# Decisions

Decisions taken where the PRD was unclear or the environment forced a choice.
Format: date — decision — reason.

- 2026-11-21 — Push works (`git push --dry-run` OK); commits are pushed to `origin/main`. — Preflight check.
- 2026-11-21 — Next.js 16.4 (App Router, Turbopack, scaffold defaults) with pnpm 9. — Latest stable `create-next-app`; the PRD only says "Next.js (App Router)".
- 2026-11-21 — The WASM module is loaded with the wasm-pack `--target web` glue inside `src/engine/worker.ts`, started with `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`. — Turbopack bundles workers and `new URL(..., import.meta.url)` assets natively; no extra config needed. Verified in `next dev` and `next start`.
- 2026-11-21 — `wasm-opt` is disabled in wasm-pack (`[package.metadata.wasm-pack.profile.release] wasm-opt = false`). — Avoids downloading binaryen; the module is small and the build is faster and more reliable.
- 2026-11-21 — Rust dev/test profiles build without debug info. — The build machine has very little free disk space.
- 2026-11-21 — Playwright uses the locally installed Google Chrome (`channel: "chrome"`); CI installs Playwright's Chromium and sets `PW_CHANNEL=""`. — Avoids a large browser download on a nearly full disk.
- 2026-11-21 — `pnpm lint` runs ESLint and `prettier --check`. — CLAUDE.md requires "ESLint + Prettier clean" with one lint command.
- 2026-11-21 — The e2e suite runs against the production server (`pnpm start`), so `pnpm build` must run first. — Tests what the team will deploy.
- 2026-11-21 — Engine output on failure is `{"error": "<message>"}` instead of a report. — Simple JSON contract; the client checks for the `error` key.
- 2026-11-21 — Orders may carry an optional `date` (YYYY-MM-DD). The engine annualizes totals by 365 / (days spanned by dates); with no dates the dataset is treated as one year. — PRD 8.4 asks for annualization but does not define a date column.
- 2026-11-21 — Summary before/after totals are computed on the orders that both scenarios can serve; orders served/flagged by each are reported separately. — Keeps the comparison fair when the seller's current boxes cannot fit some orders.
- 2026-11-21 — Parcels heavier than the rate table maximum (70 lb) are priced by extending the linear table. — The PRD rate table stops at 70 lb; extending keeps very large boxes expensive, as they would be.
- 2026-11-21 — The stock catalog stores dimensions only (83 sizes); unit cost is computed in the engine from the formula in config.rs. — One source for the price formula.
- 2026-11-21 — Sample current boxes cost $0.85 / $1.35 / $1.95 (slightly above the stock formula, as small-quantity buyers pay). The sample `orders.csv` has an extra `order_date` column (2025 dates, mild Q4 peak). — PRD gives sizes but no prices.
- 2026-11-21 — Web tests parse `engine/src/types.rs` and `engine/src/config.rs` and fail if `types.ts` / `defaults.ts` drift. — Enforces the "exactly in sync" rule automatically.
- 2026-11-21 — Prettier config lives at the repo root and `pnpm lint` also checks `scripts/`. — The sample generator lives outside `web/`.
- 2026-11-21 — Optimizer local search uses best-improvement swaps evaluated incrementally (best and second-best cost per signature), and each K keeps the best of several deterministic starts: plain greedy, the K−1 solution plus one greedy box, and greedy seeded with each of the 6 best single boxes. — Plain greedy + first-improvement swap missed the brute-force optimum in ~3% of random tiny instances (gap up to 6.8%); with these starts it is 1 in 1,600 (gap 1.2%) and exact on all geometric test instances. Seeding from K−1 also guarantees the K-curve never increases.
- 2026-11-21 — `CurvePoint` has an `orders_unserved` field. — With few box sizes, some signatures may fit only boxes that are not selected; the curve shows how many.
- 2026-11-21 — Signature ids are frequency ranks (0 = most frequent), so "top 50 signatures" for the 3D viewer are ids 0–49. — Simple and deterministic.
- 2026-11-21 — Empty space and all `*_pct` fields are percentages (0–100). — Consistent display.
- 2026-11-21 — Besides `optimize`, `validate` and `version`, the WASM module exports `optimize_with_progress(input_json, on_stage)`; the worker uses it to post stage texts ("Checking fits…") while the engine runs. Input and output stay JSON strings. — PRD 8.8 asks for stage text in the UI; a synchronous WASM call cannot report progress otherwise.
- 2026-11-21 — The `/dev` page stays in the app as an engine diagnostics page (version + raw report JSON). — Useful for the team; it is not linked from the main navigation.
- 2026-11-21 — shadcn/ui initialized with the Radix base and "nova" preset; it uses the official `cn` class-merging package. Theme colors are replaced with kraft brown (#b08d57, darker #7a5c2e for text/buttons) and a green accent (#2f7d4f). — PRD style section.
- 2026-11-21 — Column mapping auto-detects units from header names ("Length (cm)", "Variant Grams"); the mapping screen lets the user change the length and weight unit per file. Missing box costs fall back to the stock estimate with a warning. — PRD asks for metric support at input; most exports carry units in the header.
- 2026-11-21 — `/app?sample=1` loads the sample store and runs the optimizer straight away. — Target of the landing page's "Try with a sample store" button; reading `window.location` avoids a Suspense boundary for `useSearchParams`.
- 2026-11-21 — Unknown SKUs in orders are reported once per SKU with a count (not once per row). — Large exports would otherwise flood the validation list.
- 2026-11-21 — The before/after chart is three small bar panels (total $, cardboard, shipped volume), each on its own axis with direct value labels. Before = kraft #b07f3a, after = green #2f7d4f (checked with the dataviz palette validator; the CVD gap is in the 6–8 band, so bars always carry "Before"/"After" text labels). — One axis per measure; no dual-axis chart.
- 2026-11-21 — Changing K on the results page re-runs the optimizer (≈0.1–0.5 s) instead of only switching curve points. — Assignments, placements and box usage are computed for the chosen K only.
