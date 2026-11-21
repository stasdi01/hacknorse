import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as defaults from "./defaults";

const configRs = readFileSync(path.resolve(__dirname, "../../../engine/src/config.rs"), "utf8");

/** Parse `pub const NAME: T = value;` lines from config.rs. */
function rustConstants(src: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /pub const (\w+):[^=]+=\s*([^;]+);/g;
  for (const m of src.matchAll(re)) out.set(m[1], m[2].trim());
  return out;
}

describe("defaults.ts mirrors engine/src/config.rs", () => {
  const consts = rustConstants(configRs);
  const ts = defaults as unknown as Record<string, unknown>;

  it("finds the Rust constants", () => {
    expect(consts.size).toBeGreaterThan(20);
  });

  for (const [name, raw] of rustConstants(configRs)) {
    it(`${name} matches`, () => {
      expect(ts).toHaveProperty(name);
      const tsValue = ts[name];
      if (raw.startsWith("[")) {
        const arr = raw
          .slice(1, -1)
          .split(",")
          .map((v) => Number(v.trim()));
        expect(Array.from(tsValue as readonly number[])).toEqual(arr);
      } else {
        expect(tsValue).toBe(Number(raw.replace(/_/g, "")));
      }
    });
  }

  it("marks the same assumptions", () => {
    const tsSrc = readFileSync(path.resolve(__dirname, "defaults.ts"), "utf8");
    const count = (s: string) => (s.match(/ASSUMPTION: verify before presenting/g) ?? []).length;
    expect(count(tsSrc)).toBe(count(configRs));
  });
});
