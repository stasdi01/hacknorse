# Benchmark: Rust vs. Python fit checks (stretch goal S2)

`python_packer.py` is a line-by-line port of the engine's fit check
(`engine/src/packer.rs`): padding, fast rejects, the exact single-item rule and the two-pass
extreme-point heuristic with the same point order, orientations, tie-breaking and tolerance.
It runs the same fit checks as the Rust engine and compares both the answers and the speed.

## Run it

From the repository root (needs Rust; Python 3.9+ with no extra packages):

```bash
cargo run --release --manifest-path engine/Cargo.toml --example fit_bench > bench/instance.json
python3 bench/python_packer.py bench/instance.json
```

`fit_bench` loads the sample store, builds the 969 order types and the 83 stock boxes, times
every (order type, box) fit check in Rust (median of 5 runs, no cache) and writes the instance,
its answers and the timing as JSON. The Python script re-runs all checks, verifies that every
answer agrees, and prints the table below. (`bench/instance.json` is generated and not committed.)

## Results

Sample store ("Fern & Kiln", 3,000 orders): 969 order types (929 multi-item) × 83 stock boxes
= 80,427 fit checks, padding 0.5 in. Apple Silicon laptop (arm64), Python 3.12.3, Rust 1.100
release build.

| Implementation         | Median time (5 runs) | Per check | Fits found | Agreement |
| ---------------------- | -------------------: | --------: | ---------: | --------: |
| Rust (native, release) |              14.4 ms |   0.18 µs |     47,478 | reference |
| Python (pure)          |             799.7 ms |   9.94 µs |     47,478 |   100.00% |

**Rust is about 55× faster on the same fit checks, with identical answers.** In the app the
engine runs as WebAssembly in the browser, where the full sample-store optimization (fit
checks, cost matrix, optimizer for K = 1..8, report) takes about 80 ms in stock mode and
250 ms in custom mode, which is what makes interactive "what if" changes (K slider, padding,
carrier) possible without a server.

Times vary by machine; the agreement column should always be 100%.
