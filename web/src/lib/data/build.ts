/**
 * Turn parsed CSVs + column mappings into engine input, collecting
 * validation issues. Bad rows are skipped and counted.
 */
import { stockUnitCost } from "@/engine/defaults";
import type { BoxSpec, OrderLine, Product } from "@/engine/types";
import type { ParsedCsv } from "./csv";
import {
  FIELD_DEFS,
  missingRequired,
  type ColumnMapping,
  type Field,
  type FileKind,
} from "./mapping";
import { toInches, toPounds, type LengthUnit, type WeightUnit } from "./units";

export interface Issue {
  file: FileKind;
  /** 1-based data row (header excluded); null for file-level issues. */
  row: number | null;
  severity: "error" | "warning";
  message: string;
}

export interface FileInput {
  csv: ParsedCsv;
  mapping: ColumnMapping;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
}

export interface BuildResult<T> {
  rows: T[];
  issues: Issue[];
  skipped: number;
  /** False when a required column is not mapped (nothing can be read). */
  usable: boolean;
}

const MAX_ISSUES_PER_FILE = 500;

function cell(row: string[], mapping: ColumnMapping, field: Field): string {
  const idx = mapping[field];
  return idx === null || idx === undefined ? "" : (row[idx] ?? "").trim();
}

/** Parse a number, accepting "1,234.5" and "3.5 in". */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/,(?=\d{3}\b)/g, "").replace(/[^0-9eE+\-.]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Normalize a date to YYYY-MM-DD, or null. */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (s === "") return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

function fileLevel(kind: FileKind, mapping: ColumnMapping): Issue[] {
  return missingRequired(kind, mapping).map((d) => ({
    file: kind,
    row: null,
    severity: "error" as const,
    message: `Required column "${d.label}" is not mapped.`,
  }));
}

function pushIssue(issues: Issue[], issue: Issue): void {
  if (issues.length < MAX_ISSUES_PER_FILE) issues.push(issue);
}

export function buildProducts(input: FileInput): BuildResult<Product> {
  const { csv, mapping, lengthUnit, weightUnit } = input;
  const issues = fileLevel("products", mapping);
  if (issues.length > 0) return { rows: [], issues, skipped: csv.rows.length, usable: false };

  const rows: Product[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  csv.rows.forEach((r, i) => {
    const row = i + 1;
    const sku = cell(r, mapping, "sku");
    const err = (message: string) => {
      pushIssue(issues, { file: "products", row, severity: "error", message });
      skipped++;
    };
    if (!sku) return err("Missing SKU.");
    if (seen.has(sku)) return err(`Duplicate SKU "${sku}" (first row kept).`);
    const dims: number[] = [];
    for (const f of ["length", "width", "height"] as const) {
      const raw = cell(r, mapping, f);
      const v = parseNumber(raw);
      if (raw === "" || v === null) return err(`SKU "${sku}": missing ${f}.`);
      if (v <= 0) return err(`SKU "${sku}": ${f} must be positive (got ${raw}).`);
      dims.push(toInches(v, lengthUnit));
    }
    const rawW = cell(r, mapping, "weight");
    const w = parseNumber(rawW);
    if (rawW === "" || w === null) return err(`SKU "${sku}": missing weight.`);
    if (w <= 0) return err(`SKU "${sku}": weight must be positive (got ${rawW}).`);
    seen.add(sku);
    rows.push({
      sku,
      name: cell(r, mapping, "name") || sku,
      length_in: dims[0],
      width_in: dims[1],
      height_in: dims[2],
      weight_lb: toPounds(w, weightUnit),
    });
  });
  return { rows, issues, skipped, usable: true };
}

export function buildOrders(
  input: FileInput,
  knownSkus: ReadonlySet<string> | null,
): BuildResult<OrderLine> {
  const { csv, mapping } = input;
  const issues = fileLevel("orders", mapping);
  if (issues.length > 0) return { rows: [], issues, skipped: csv.rows.length, usable: false };

  const rows: OrderLine[] = [];
  let skipped = 0;
  let badDates = 0;
  const unknown = new Map<string, number>();
  csv.rows.forEach((r, i) => {
    const row = i + 1;
    const err = (message: string) => {
      pushIssue(issues, { file: "orders", row, severity: "error", message });
      skipped++;
    };
    const orderId = cell(r, mapping, "order_id");
    const sku = cell(r, mapping, "sku");
    if (!orderId) return err("Missing order ID.");
    if (!sku) return err(`Order ${orderId}: missing SKU.`);
    if (knownSkus && !knownSkus.has(sku)) {
      unknown.set(sku, (unknown.get(sku) ?? 0) + 1);
      skipped++;
      return;
    }
    const rawQ = cell(r, mapping, "quantity");
    const q = parseNumber(rawQ);
    if (rawQ === "" || q === null) return err(`Order ${orderId}: missing quantity.`);
    if (q <= 0 || !Number.isInteger(q))
      return err(`Order ${orderId}: quantity must be a positive whole number (got ${rawQ}).`);
    const line: OrderLine = { order_id: orderId, sku, quantity: q };
    const rawDate = cell(r, mapping, "date");
    if (rawDate) {
      const d = normalizeDate(rawDate);
      if (d) line.date = d;
      else badDates++;
    }
    rows.push(line);
  });
  for (const [sku, n] of unknown) {
    pushIssue(issues, {
      file: "orders",
      row: null,
      severity: "error",
      message: `Unknown SKU "${sku}" (not in products): ${n} line item${n === 1 ? "" : "s"} skipped.`,
    });
  }
  if (badDates > 0) {
    pushIssue(issues, {
      file: "orders",
      row: null,
      severity: "warning",
      message: `${badDates} order date${badDates === 1 ? "" : "s"} could not be read and were ignored.`,
    });
  }
  return { rows, issues, skipped, usable: true };
}

export function buildBoxes(input: FileInput): BuildResult<BoxSpec> {
  const { csv, mapping, lengthUnit } = input;
  const issues = fileLevel("boxes", mapping);
  if (issues.length > 0) return { rows: [], issues, skipped: csv.rows.length, usable: false };

  const rows: BoxSpec[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  csv.rows.forEach((r, i) => {
    const row = i + 1;
    const err = (message: string) => {
      pushIssue(issues, { file: "boxes", row, severity: "error", message });
      skipped++;
    };
    const id = cell(r, mapping, "box_id") || `Box ${row}`;
    if (seen.has(id)) return err(`Duplicate box "${id}".`);
    const dims: number[] = [];
    for (const f of ["length", "width", "height"] as const) {
      const raw = cell(r, mapping, f);
      const v = parseNumber(raw);
      if (raw === "" || v === null) return err(`Box "${id}": missing ${f}.`);
      if (v <= 0) return err(`Box "${id}": ${f} must be positive (got ${raw}).`);
      dims.push(toInches(v, lengthUnit));
    }
    const rawCost = cell(r, mapping, "unit_cost");
    let cost = parseNumber(rawCost);
    if (cost === null || cost < 0) {
      cost = stockUnitCost(dims[0], dims[1], dims[2]);
      pushIssue(issues, {
        file: "boxes",
        row,
        severity: "warning",
        message: `Box "${id}": no unit cost, using the estimate $${cost.toFixed(2)}.`,
      });
    }
    seen.add(id);
    rows.push({
      box_id: id,
      length_in: dims[0],
      width_in: dims[1],
      height_in: dims[2],
      unit_cost_usd: cost,
    });
  });
  return { rows, issues, skipped, usable: true };
}

/** All field definitions of a file kind (re-exported for the UI). */
export { FIELD_DEFS };
