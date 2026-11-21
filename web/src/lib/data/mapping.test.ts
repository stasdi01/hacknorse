import { describe, expect, it } from "vitest";
import { autoMap, missingRequired, normalizeHeader } from "./mapping";

describe("normalizeHeader", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeHeader("Lineitem SKU")).toBe("lineitemsku");
    expect(normalizeHeader("Length (in)")).toBe("lengthin");
  });
});

describe("autoMap", () => {
  it("maps our own template headers exactly", () => {
    const m = autoMap("products", [
      "sku",
      "name",
      "length_in",
      "width_in",
      "height_in",
      "weight_lb",
    ]);
    expect(m).toEqual({ sku: 0, name: 1, length: 2, width: 3, height: 4, weight: 5 });
  });

  it("maps a Shopify order export", () => {
    const headers = [
      "Name",
      "Email",
      "Financial Status",
      "Created at",
      "Lineitem quantity",
      "Lineitem name",
      "Lineitem price",
      "Lineitem sku",
    ];
    const m = autoMap("orders", headers);
    expect(m.order_id).toBe(0);
    expect(m.quantity).toBe(4);
    expect(m.sku).toBe(7);
    expect(m.date).toBe(3);
  });

  it("maps renamed product columns with units", () => {
    const headers = [
      "Product Code",
      "Title",
      "Length (cm)",
      "Width (cm)",
      "Height (cm)",
      "Weight (kg)",
    ];
    const m = autoMap("products", headers);
    expect(m).toEqual({ sku: 0, name: 1, length: 2, width: 3, height: 4, weight: 5 });
  });

  it("maps short headers L/W/H and Qty", () => {
    expect(autoMap("boxes", ["Box", "L", "W", "H", "Cost"])).toEqual({
      box_id: 0,
      length: 1,
      width: 2,
      height: 3,
      unit_cost: 4,
    });
    const o = autoMap("orders", ["Order #", "Item SKU", "Qty"]);
    expect(o).toMatchObject({ order_id: 0, sku: 1, quantity: 2, date: null });
  });

  it("uses each column at most once and reports missing required fields", () => {
    const m = autoMap("products", ["sku", "colour"]);
    expect(m.sku).toBe(0);
    expect(m.length).toBeNull();
    expect(missingRequired("products", m).map((d) => d.field)).toEqual([
      "length",
      "width",
      "height",
      "weight",
    ]);
  });
});
