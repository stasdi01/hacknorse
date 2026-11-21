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
