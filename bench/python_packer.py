#!/usr/bin/env python3
"""Pure-Python port of the engine's fit check, benchmarked against Rust.

Mirrors engine/src/packer.rs exactly: padding, fast rejects, the exact
single-item rule and the two-pass extreme-point heuristic (points sorted by
(z, y, x), all six orientations, same tie-breaking and tolerance).

Usage (from the repository root):

    cargo run --release --manifest-path engine/Cargo.toml --example fit_bench > bench/instance.json
    python3 bench/python_packer.py bench/instance.json

The Rust harness exports the sample-store instance (signatures x stock boxes),
its answers and its median time. This script re-runs every fit check in
Python, checks that the answers agree, and prints a results table.
No third-party packages are needed.
"""

from __future__ import annotations

import json
import platform
import statistics
import sys
import time

EPS = 1e-9


def sorted_desc(d):
    return sorted(d, reverse=True)


def volume(d):
    return d[0] * d[1] * d[2]


def orientations(d):
    a, b, c = d
    out = []
    for o in ((a, b, c), (a, c, b), (b, a, c), (b, c, a), (c, a, b), (c, b, a)):
        if o not in out:
            out.append(o)
    return out


def overlaps(p1, s1, p2, s2):
    return all(p1[i] < p2[i] + s2[i] - EPS and p2[i] < p1[i] + s1[i] - EPS for i in range(3))


def extreme_point_pack(items, order, usable):
    placed = []  # (pos, size)
    points = [(0.0, 0.0, 0.0)]
    for idx in order:
        points.sort(key=lambda p: (p[2], p[1], p[0]))
        chosen = None
        for pi, p in enumerate(points):
            for o in orientations(items[idx]):
                if any(p[i] + o[i] > usable[i] + EPS for i in range(3)):
                    continue
                if any(overlaps(p, o, q, qs) for q, qs in placed):
                    continue
                chosen = (pi, o)
                break
            if chosen:
                break
        if chosen is None:
            return False
        pi, size = chosen
        pos = points.pop(pi)
        placed.append((pos, size))
        for np_ in (
            (pos[0] + size[0], pos[1], pos[2]),
            (pos[0], pos[1] + size[1], pos[2]),
            (pos[0], pos[1], pos[2] + size[2]),
        ):
            inside = all(np_[i] < usable[i] - EPS for i in range(3))
            dup = any(all(abs(q[i] - np_[i]) <= EPS for i in range(3)) for q in points)
            if inside and not dup:
                points.append(np_)
    return True


def fits(items, box, padding):
    """True if all items fit in the box (interior dims) with padding per side."""
    if not items:
        return True
    usable = [box[i] - 2.0 * padding for i in range(3)]
    if any(u <= 0.0 for u in usable):
        return False
    us = sorted_desc(usable)
    if sum(volume(d) for d in items) > volume(usable) + EPS:
        return False
    for d in items:
        s = sorted_desc(d)
        if any(s[i] > us[i] + EPS for i in range(3)):
            return False
    if len(items) == 1:
        return True
    n = len(items)
    # Attempt 1: volume descending (tie: longest side, then index).
    order = sorted(range(n), key=lambda i: (-volume(items[i]), -max(items[i]), i))
    if extreme_point_pack(items, order, usable):
        return True
    # Attempt 2: longest side descending (tie: volume, then index).
    order = sorted(range(n), key=lambda i: (-max(items[i]), -volume(items[i]), i))
    return extreme_point_pack(items, order, usable)


def main(path: str) -> int:
    with open(path, encoding="utf-8") as f:
        inst = json.load(f)
    sigs = [[tuple(d) for d in s] for s in inst["signatures"]]
    boxes = [tuple(b) for b in inst["boxes"]]
    padding = inst["padding"]
    expected = inst["answers"]

    times = []
    answers = ""
    for run in range(5):
        t = time.perf_counter()
        out = []
        for items in sigs:
            for b in boxes:
                out.append("1" if fits(items, b, padding) else "0")
        times.append((time.perf_counter() - t) * 1000.0)
        if run == 0:
            answers = "".join(out)

    checks = len(sigs) * len(boxes)
    agree = sum(1 for a, b in zip(answers, expected) if a == b)
    py_ms = statistics.median(times)
    rust_ms = inst["rust_ms_median"]
    multi = sum(1 for s in sigs if len(s) > 1)

    print(f"Instance: {len(sigs)} order types ({multi} multi-item) x {len(boxes)} stock boxes"
          f" = {checks:,} fit checks, padding {padding} in")
    print(f"Python {platform.python_version()} on {platform.machine()}\n")
    print("| Implementation | Median time (5 runs) | Per check | Fits found | Agreement |")
    print("| --- | ---: | ---: | ---: | ---: |")
    print(f"| Rust (native, release) | {rust_ms:,.1f} ms | {rust_ms * 1000 / checks:.2f} µs"
          f" | {expected.count('1'):,} | reference |")
    print(f"| Python (pure) | {py_ms:,.1f} ms | {py_ms * 1000 / checks:.2f} µs"
          f" | {answers.count('1'):,} | {agree / checks * 100:.2f}% |")
    print(f"\nRust is {py_ms / rust_ms:.0f}x faster on the same fit checks.")
    if agree != checks:
        print(f"MISMATCH: {checks - agree} answers differ", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
