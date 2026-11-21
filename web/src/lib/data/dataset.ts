/** Orchestrates CSV text → mapped files → engine input. */
import type { OptimizeInput, Settings } from "@/engine/types";
import { buildBoxes, buildOrders, buildProducts, type FileInput, type Issue } from "./build";
import { parseCsv } from "./csv";
import { autoMap, type FileKind } from "./mapping";
import { guessLengthUnit, guessWeightUnit, type LengthUnit, type WeightUnit } from "./units";

/** Parse a CSV file and suggest a mapping and units. */
export function prepareFile(
  kind: FileKind,
  text: string,
  fallback: { length: LengthUnit; weight: WeightUnit } = { length: "in", weight: "lb" },
): FileInput {
  const csv = parseCsv(text);
  const mapping = autoMap(kind, csv.headers);
  const header = (i: number | null | undefined) =>
    i === null || i === undefined ? "" : (csv.headers[i] ?? "");
  const lengthUnit = guessLengthUnit(header(mapping.length)) ?? fallback.length;
  const weightUnit = guessWeightUnit(header(mapping.weight)) ?? fallback.weight;
  return { csv, mapping, lengthUnit, weightUnit };
}

export interface DatasetFiles {
  products: FileInput | null;
  orders: FileInput | null;
  boxes: FileInput | null;
}

export interface DatasetResult {
  input: Omit<OptimizeInput, "settings"> | null;
  issues: Issue[];
  counts: Record<FileKind, { valid: number; skipped: number; total: number }>;
  /** True when the engine can run (products and orders usable and non-empty). */
  ready: boolean;
}

/** Validate all files and build the engine input (without settings). */
export function buildDataset(files: DatasetFiles): DatasetResult {
  const issues: Issue[] = [];
  const counts: DatasetResult["counts"] = {
    products: { valid: 0, skipped: 0, total: 0 },
    orders: { valid: 0, skipped: 0, total: 0 },
    boxes: { valid: 0, skipped: 0, total: 0 },
  };

  const products = files.products ? buildProducts(files.products) : null;
  if (products && files.products) {
    issues.push(...products.issues);
    counts.products = {
      valid: products.rows.length,
      skipped: products.skipped,
      total: files.products.csv.rows.length,
    };
  }
  const known = products?.usable ? new Set(products.rows.map((p) => p.sku)) : null;
  const orders = files.orders ? buildOrders(files.orders, known) : null;
  if (orders && files.orders) {
    issues.push(...orders.issues);
    counts.orders = {
      valid: orders.rows.length,
      skipped: orders.skipped,
      total: files.orders.csv.rows.length,
    };
  }
  const boxes = files.boxes ? buildBoxes(files.boxes) : null;
  if (boxes && files.boxes) {
    issues.push(...boxes.issues);
    counts.boxes = {
      valid: boxes.rows.length,
      skipped: boxes.skipped,
      total: files.boxes.csv.rows.length,
    };
  }

  const ready =
    !!products?.usable && !!orders?.usable && products.rows.length > 0 && orders.rows.length > 0;
  return {
    input: ready
      ? {
          products: products.rows,
          orders: orders.rows,
          current_boxes: boxes?.usable ? boxes.rows : [],
        }
      : null,
    issues,
    counts,
    ready,
  };
}

/** Attach settings to a dataset input. */
export function withSettings(
  input: Omit<OptimizeInput, "settings">,
  settings: Settings,
): OptimizeInput {
  return { ...input, settings };
}
