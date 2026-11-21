# Box Optimizer (working title)

> Stop shipping air.

Designs the best set of shipping box sizes for a small online store from its own order history, so it ships less air, uses less cardboard and pays less for shipping. Everything runs in the browser: a Rust engine compiled to WebAssembly runs inside a Web Worker, and order data never leaves your computer.

> This README is a skeleton; it is completed in milestone M13.

## Run locally

Prerequisites: Node 20+, pnpm 9, Rust stable with the `wasm32-unknown-unknown` target, and wasm-pack (only needed when you change the engine).

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000
```

Production build:

```bash
cd web
pnpm build && pnpm start
```

Rebuild the engine (output in `web/src/engine-wasm/` is committed):

```bash
scripts/build-wasm.sh
```

## Repository layout

```
engine/   Rust crate (packer, cost model, optimizer) + WASM bindings
web/      Next.js app (App Router)
scripts/  build-wasm.sh, generate-sample.ts
docs/     PRD, progress, decisions
```

## Tests

```bash
cd engine && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
cd web && pnpm lint && pnpm test && pnpm build && pnpm test:e2e
```
