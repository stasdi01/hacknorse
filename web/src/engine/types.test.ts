import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rs = readFileSync(path.resolve(__dirname, "../../../engine/src/types.rs"), "utf8");
const ts = readFileSync(path.resolve(__dirname, "types.ts"), "utf8");

/** struct name → field names, from Rust. */
function rustStructs(src: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(/pub struct (\w+) \{([^}]*)\}/g)) {
    const fields = [...m[2].matchAll(/pub (\w+):/g)].map((f) => f[1]);
    out.set(m[1], fields);
  }
  return out;
}

/** interface name → field names, from TypeScript. */
function tsInterfaces(src: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(/export interface (\w+) \{([^}]*)\}/g)) {
    const body = m[2].replace(/\/\*\*[\s\S]*?\*\//g, "");
    const fields = [...body.matchAll(/^\s*(\w+)\??:/gm)].map((f) => f[1]);
    out.set(m[1], fields);
  }
  return out;
}

/** enum name → serialized (snake_case) variants, from Rust. */
function rustEnums(src: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(/pub enum (\w+) \{([^}]*)\}/g)) {
    const body = m[2].replace(/\/\/\/.*$/gm, "");
    const variants = [...body.matchAll(/^\s*(\w+),/gm)].map((v) =>
      v[1].replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase(),
    );
    out.set(m[1], variants);
  }
  return out;
}

/** type alias name → string literal members, from TypeScript. */
function tsUnions(src: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(/export type (\w+) =([^;]+);/g)) {
    out.set(
      m[1],
      [...m[2].matchAll(/"(\w+)"/g)].map((v) => v[1]),
    );
  }
  return out;
}

describe("types.ts mirrors engine/src/types.rs", () => {
  const structs = rustStructs(rs);
  const interfaces = tsInterfaces(ts);

  it("has the same struct/interface names", () => {
    expect([...interfaces.keys()].sort()).toEqual([...structs.keys()].sort());
  });

  for (const [name, fields] of structs) {
    it(`${name} has the same fields`, () => {
      expect(interfaces.get(name)).toEqual(fields);
    });
  }

  const enums = rustEnums(rs);
  const unions = tsUnions(ts);
  for (const [name, variants] of enums) {
    it(`${name} has the same variants`, () => {
      expect(unions.get(name)).toEqual(variants);
    });
  }
});
