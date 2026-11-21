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
