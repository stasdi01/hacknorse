#!/usr/bin/env bash
# Build the Rust engine to WebAssembly and place the package in
# web/src/engine-wasm/ (this output is committed).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/web/src/engine-wasm"

if [ -f "$HOME/.cargo/env" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
fi

cd "$ROOT/engine"
wasm-pack build --release --target web --out-dir "$OUT" --out-name box_engine --no-pack
# wasm-pack writes its own .gitignore ("*") into the out dir; remove it so
# the build output is committed.
rm -f "$OUT/.gitignore"
echo "WASM package written to $OUT"
