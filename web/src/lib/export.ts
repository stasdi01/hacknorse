/** Export builders: buying list and packing guide CSVs. */
import type { Report } from "@/engine/types";
import { toCsv } from "./data/csv";

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Buying list: the recommended boxes with a suggested yearly quantity
 * (= orders per year packed in that box, rounded up).
 */
export function buyingListCsv(report: Report): string {
  const rows = report.recommended.map((b) => {
    const qty = Math.ceil(b.orders - 1e-9);
    return [
      b.box_id,
      r2(b.length_in),
      r2(b.width_in),
      r2(b.height_in),
      b.source,
      r2(b.unit_cost_usd),
      qty,
      r2(qty * b.unit_cost_usd),
      r2(b.orders_pct),
    ];
  });
  return toCsv(
    [
      "box_id",
      "length_in",
      "width_in",
      "height_in",
      "source",
      "unit_cost_usd_estimate",
      "suggested_quantity_per_year",
      "estimated_cost_usd_per_year",
      "share_of_orders_pct",
    ],
    rows,
  );
}

/** Packing guide: which box to use for each distinct order contents. */
export function packingGuideCsv(report: Report, names: ReadonlyMap<string, string>): string {
  const flaggedNoCandidate = new Set(
    report.flagged
      .filter((f) => f.reason === "fits_no_candidate" && f.signature_id !== null)
      .map((f) => f.signature_id),
  );
  const rows = report.assignments.map((a) => [
    a.items.map((i) => `${i.quantity} x ${i.sku}`).join(" + "),
    a.items.map((i) => `${i.quantity} x ${names.get(i.sku) ?? i.sku}`).join(" + "),
    a.items.reduce((s, i) => s + i.quantity, 0),
    Math.round(a.count * report.annualization.factor),
    a.optimized?.box_id ?? (flaggedNoCandidate.has(a.signature_id) ? "needs 2+ boxes" : ""),
    a.optimized ? r2(a.optimized.empty_space_pct) : "",
    a.baseline?.box_id ?? "fits none",
    a.baseline ? r2(a.baseline.empty_space_pct) : "",
  ]);
  return toCsv(
    [
      "order_contents_skus",
      "order_contents_names",
      "items",
      "orders_per_year",
      "recommended_box",
      "recommended_empty_space_pct",
      "current_box",
      "current_empty_space_pct",
    ],
    rows,
  );
}
