import { describe, expect, it } from "vitest";
import { normalizeDate, parseNumber } from "./build";
import { buildDataset, prepareFile } from "./dataset";

const products = `sku,name,length_in,width_in,height_in,weight_lb
A,Alpha,3,3,3,1
B,Beta,,2,2,1
C,Gamma,2,-1,2,1
A,Alpha again,4,4,4,1
D,Delta,1,1,1,0.5
`;

const orders = `order_id,sku,quantity,order_date
1,A,2,2025-01-03
1,D,1,2025-01-03
2,ZZZ,1,2025-01-04
3,A,0,2025-01-05
4,D,1.5,2025-01-06
5,A,1,not a date
`;

const boxes = `box_id,length_in,width_in,height_in,unit_cost_usd
Small,8,8,8,0.85
NoCost,10,8,6,
Broken,0,8,6,1
`;

describe("validation", () => {
  const ds = buildDataset({
    products: prepareFile("products", products),
    orders: prepareFile("orders", orders),
    boxes: prepareFile("boxes", boxes),
  });
  const messages = ds.issues.map((i) => i.message);

  it("skips bad product rows with clear messages", () => {
    expect(ds.counts.products).toEqual({ valid: 2, skipped: 3, total: 5 });
    expect(messages).toContain('SKU "B": missing length.');
    expect(messages).toContain('SKU "C": width must be positive (got -1).');
    expect(messages).toContain('Duplicate SKU "A" (first row kept).');
  });

  it("reports unknown SKUs and bad quantities in orders", () => {
    expect(ds.counts.orders.valid).toBe(3);
    expect(ds.counts.orders.skipped).toBe(3);
    expect(messages).toContain('Unknown SKU "ZZZ" (not in products): 1 line item skipped.');
    expect(messages).toContain("Order 3: quantity must be a positive whole number (got 0).");
    expect(messages).toContain("Order 4: quantity must be a positive whole number (got 1.5).");
    expect(messages).toContain("1 order date could not be read and was ignored.");
  });

  it("estimates missing box costs and skips broken boxes", () => {
    expect(ds.counts.boxes).toEqual({ valid: 2, skipped: 1, total: 3 });
    expect(ds.input?.current_boxes[1].unit_cost_usd).toBeCloseTo(0.2 + 0.0015 * 376, 9);
    expect(messages).toContain('Box "Broken": length must be positive (got 0).');
  });

  it("is ready and converts rows to engine input", () => {
    expect(ds.ready).toBe(true);
    expect(ds.input?.orders[0]).toEqual({
      order_id: "1",
      sku: "A",
      quantity: 2,
      date: "2025-01-03",
    });
  });

  it("is not ready when a required column is unmapped", () => {
    const bad = buildDataset({
      products: prepareFile("products", "sku,colour\nA,red\n"),
      orders: prepareFile("orders", orders),
      boxes: null,
    });
    expect(bad.ready).toBe(false);
    expect(bad.issues.map((i) => i.message)).toContain('Required column "Length" is not mapped.');
  });

  it("converts metric product files", () => {
    const metric = buildDataset({
      products: prepareFile(
        "products",
        "SKU,Length (cm),Width (cm),Height (cm),Weight (kg)\nA,25.4,10,5,1\n",
      ),
      orders: prepareFile("orders", "order,sku,qty\n1,A,1\n"),
      boxes: null,
    });
    expect(metric.input?.products[0].length_in).toBeCloseTo(10, 9);
    expect(metric.input?.products[0].weight_lb).toBeCloseTo(2.20462262, 6);
  });
});

describe("parsers", () => {
  it("parses numbers", () => {
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("3.5 in")).toBe(3.5);
    expect(parseNumber("abc")).toBeNull();
  });
  it("normalizes dates", () => {
    expect(normalizeDate("2025-03-14 10:22:11 -0500")).toBe("2025-03-14");
    expect(normalizeDate("March 14, 2025")).toMatch(/^2025-03-1[34]$/);
    expect(normalizeDate("garbage")).toBeNull();
  });
});
