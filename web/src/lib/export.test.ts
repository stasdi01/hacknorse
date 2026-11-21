import { describe, expect, it } from "vitest";
import type { Assignment, BoxUsage, Report } from "@/engine/types";
import { parseCsv } from "./data/csv";
import { buyingListCsv, packingGuideCsv } from "./export";

const box = (id: string, orders: number): BoxUsage => ({
  box_id: id,
  length_in: 10,
  width_in: 8,
  height_in: 6,
  unit_cost_usd: 0.764,
  source: "stock",
  orders,
  orders_pct: 50,
});

const metrics = (id: string, empty: number) => ({
  box_id: id,
  billable_lb: 2,
  shipping_usd: 9.45,
  box_usd: 0.76,
  total_usd: 10.21,
  empty_space_pct: empty,
  cardboard_lb: 0.34,
  shipped_ft3: 0.28,
});

const assignments: Assignment[] = [
  {
    signature_id: 0,
    items: [
      { sku: "A", quantity: 2 },
      { sku: "B", quantity: 1 },
    ],
    count: 10,
    item_volume_in3: 100,
    item_weight_lb: 2,
    baseline: metrics("Big", 90),
    optimized: metrics("S-10x8x6", 60),
  },
  {
    signature_id: 1,
    items: [{ sku: "C", quantity: 1 }],
    count: 1,
    item_volume_in3: 9000,
    item_weight_lb: 50,
    baseline: null,
    optimized: null,
  },
];

const report = {
  recommended: [box("S-10x8x6", 120.2), box("S-12x9x6", 7)],
  assignments,
  annualization: { factor: 2, period_days: 182.5, assumed_one_year: false },
  flagged: [
    {
      signature_id: 1,
      order_ids: ["9"],
      items: [{ sku: "C", quantity: 1 }],
      count: 1,
      reason: "fits_no_candidate",
    },
  ],
} as unknown as Report;

describe("exports", () => {
  it("buying list suggests the yearly quantity per box", () => {
    const csv = parseCsv(buyingListCsv(report));
    expect(csv.headers).toContain("suggested_quantity_per_year");
    expect(csv.rows[0][0]).toBe("S-10x8x6");
    expect(csv.rows[0][6]).toBe("121");
    expect(csv.rows[0][7]).toBe(String(Math.round(121 * 0.764 * 100) / 100));
    expect(csv.rows[1][6]).toBe("7");
  });

  it("packing guide maps every order type to a box", () => {
    const names = new Map([
      ["A", "Alpha, large"],
      ["B", "Beta"],
    ]);
    const csv = parseCsv(packingGuideCsv(report, names));
    expect(csv.rows).toHaveLength(2);
    expect(csv.rows[0]).toEqual([
      "2 x A + 1 x B",
      "2 x Alpha, large + 1 x Beta",
      "3",
      "20",
      "S-10x8x6",
      "60",
      "Big",
      "90",
    ]);
    expect(csv.rows[1][4]).toBe("needs 2+ boxes");
    expect(csv.rows[1][6]).toBe("fits none");
  });
});
