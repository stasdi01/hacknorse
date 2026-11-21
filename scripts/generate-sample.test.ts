import { describe, expect, it } from "vitest";
import { generateSample, SAMPLE_PRODUCTS, SAMPLE_ORDERS } from "./generate-sample";

describe("sample store generator", () => {
  const a = generateSample();

  it("is deterministic", () => {
    expect(generateSample()).toEqual(a);
  });

  it("has about 40 unique SKUs", () => {
    const skus = new Set(SAMPLE_PRODUCTS.map((p) => p.sku));
    expect(skus.size).toBe(SAMPLE_PRODUCTS.length);
    expect(skus.size).toBeGreaterThanOrEqual(38);
    expect(a.products.trim().split("\n")).toHaveLength(SAMPLE_PRODUCTS.length + 1);
  });

  it("has the configured number of orders and a realistic item mix", () => {
    const lines = a.orders.trim().split("\n").slice(1);
    const items = new Map<string, number>();
    for (const line of lines) {
      const [id, , q] = line.split(",");
      items.set(id, (items.get(id) ?? 0) + Number(q));
    }
    expect(items.size).toBe(SAMPLE_ORDERS);
    const singles = [...items.values()].filter((n) => n === 1).length / items.size;
    expect(singles).toBeGreaterThan(0.45);
    expect(singles).toBeLessThan(0.65);
    expect(Math.max(...items.values())).toBeLessThanOrEqual(6);
  });

  it("writes the three current boxes", () => {
    expect(a.currentBoxes).toContain("8,8,8");
    expect(a.currentBoxes).toContain("12,12,8");
    expect(a.currentBoxes).toContain("16,12,12");
  });
});
