import { describe, expect, it } from "vitest";
import { parseEngineOutput } from "./client";

describe("parseEngineOutput", () => {
  it("returns parsed values", () => {
    expect(parseEngineOutput<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });
  it("throws engine errors", () => {
    expect(() => parseEngineOutput('{"error":"no orders"}')).toThrow("no orders");
  });
});
