/**
 * Generates the synthetic "Fern & Kiln" sample store (candles and ceramics).
 *
 * Deterministic: a fixed seed gives byte-identical CSVs on every run.
 * Writes web/public/sample/{products,orders,current_boxes}.csv
 *
 * Run: cd web && pnpm generate-sample
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SAMPLE_SEED = 20260221;
export const SAMPLE_ORDERS = 3000;
export const SAMPLE_YEAR = 2025;

interface SampleProduct {
  sku: string;
  name: string;
  l: number;
  w: number;
  h: number;
  lb: number;
  /** Relative popularity. */
  pop: number;
  kind: "candle" | "mug" | "plate" | "other";
}

/** ~40 SKUs with packed dimensions (inches) and weights (lb). */
export const SAMPLE_PRODUCTS: SampleProduct[] = [
  // Candles: 3 sizes × 3 scents
  {
    sku: "CND-04-AMB",
    name: "Amber Candle 4oz",
    l: 2.6,
    w: 2.6,
    h: 2.8,
    lb: 0.5,
    pop: 6,
    kind: "candle",
  },
  {
    sku: "CND-04-FIG",
    name: "Fig Leaf Candle 4oz",
    l: 2.6,
    w: 2.6,
    h: 2.8,
    lb: 0.5,
    pop: 5,
    kind: "candle",
  },
  {
    sku: "CND-04-SEA",
    name: "Sea Salt Candle 4oz",
    l: 2.6,
    w: 2.6,
    h: 2.8,
    lb: 0.5,
    pop: 4,
    kind: "candle",
  },
  {
    sku: "CND-08-AMB",
    name: "Amber Candle 8oz",
    l: 3.2,
    w: 3.2,
    h: 3.6,
    lb: 0.9,
    pop: 12,
    kind: "candle",
  },
  {
    sku: "CND-08-FIG",
    name: "Fig Leaf Candle 8oz",
    l: 3.2,
    w: 3.2,
    h: 3.6,
    lb: 0.9,
    pop: 10,
    kind: "candle",
  },
  {
    sku: "CND-08-SEA",
    name: "Sea Salt Candle 8oz",
    l: 3.2,
    w: 3.2,
    h: 3.6,
    lb: 0.9,
    pop: 8,
    kind: "candle",
  },
  {
    sku: "CND-16-AMB",
    name: "Amber Candle 16oz",
    l: 4.0,
    w: 4.0,
    h: 4.6,
    lb: 1.6,
    pop: 5,
    kind: "candle",
  },
  {
    sku: "CND-16-FIG",
    name: "Fig Leaf Candle 16oz",
    l: 4.0,
    w: 4.0,
    h: 4.6,
    lb: 1.6,
    pop: 4,
    kind: "candle",
  },
  {
    sku: "CND-16-SEA",
    name: "Sea Salt Candle 16oz",
    l: 4.0,
    w: 4.0,
    h: 4.6,
    lb: 1.6,
    pop: 3,
    kind: "candle",
  },
  // Mugs
  {
    sku: "MUG-12-OAT",
    name: "Oatmeal Mug 12oz",
    l: 5.0,
    w: 3.6,
    h: 4.2,
    lb: 0.9,
    pop: 9,
    kind: "mug",
  },
  {
    sku: "MUG-12-MOS",
    name: "Moss Mug 12oz",
    l: 5.0,
    w: 3.6,
    h: 4.2,
    lb: 0.9,
    pop: 7,
    kind: "mug",
  },
  {
    sku: "MUG-16-OAT",
    name: "Oatmeal Mug 16oz",
    l: 5.4,
    w: 4.0,
    h: 4.8,
    lb: 1.1,
    pop: 5,
    kind: "mug",
  },
  {
    sku: "MUG-16-MOS",
    name: "Moss Mug 16oz",
    l: 5.4,
    w: 4.0,
    h: 4.8,
    lb: 1.1,
    pop: 4,
    kind: "mug",
  },
  // Bowls
  { sku: "BWL-S", name: "Small Bowl", l: 5.5, w: 5.5, h: 2.5, lb: 0.8, pop: 5, kind: "other" },
  { sku: "BWL-M", name: "Cereal Bowl", l: 7.0, w: 7.0, h: 3.0, lb: 1.3, pop: 5, kind: "other" },
  { sku: "BWL-L", name: "Serving Bowl", l: 10.0, w: 10.0, h: 4.0, lb: 2.8, pop: 2, kind: "other" },
  // Plates
  { sku: "PLT-S", name: "Side Plate", l: 8.0, w: 8.0, h: 1.0, lb: 1.0, pop: 4, kind: "plate" },
  { sku: "PLT-D", name: "Dinner Plate", l: 10.5, w: 10.5, h: 1.1, lb: 1.6, pop: 4, kind: "plate" },
  { sku: "PLT-P", name: "Oval Platter", l: 13.0, w: 9.0, h: 1.2, lb: 2.2, pop: 2, kind: "plate" },
  // Vases
  { sku: "VAS-BUD", name: "Bud Vase", l: 3.0, w: 3.0, h: 6.0, lb: 0.6, pop: 5, kind: "other" },
  { sku: "VAS-M", name: "Medium Vase", l: 5.0, w: 5.0, h: 9.0, lb: 1.8, pop: 3, kind: "other" },
  { sku: "VAS-T", name: "Tall Vase", l: 6.0, w: 6.0, h: 13.0, lb: 2.9, pop: 2, kind: "other" },
  { sku: "VAS-W", name: "Wide Vase", l: 8.0, w: 8.0, h: 8.0, lb: 3.2, pop: 1, kind: "other" },
  // Planters
  { sku: "PLN-S", name: "Small Planter", l: 4.5, w: 4.5, h: 4.0, lb: 1.1, pop: 4, kind: "other" },
  { sku: "PLN-M", name: "Medium Planter", l: 6.5, w: 6.5, h: 6.0, lb: 2.2, pop: 3, kind: "other" },
  { sku: "PLN-L", name: "Large Planter", l: 9.0, w: 9.0, h: 8.0, lb: 4.5, pop: 1, kind: "other" },
  // Gift sets
  {
    sku: "GFT-TRIO",
    name: "Candle Trio Gift Set",
    l: 10.0,
    w: 4.0,
    h: 4.0,
    lb: 2.0,
    pop: 4,
    kind: "other",
  },
  {
    sku: "GFT-MUGC",
    name: "Mug & Candle Gift Set",
    l: 9.0,
    w: 6.0,
    h: 5.0,
    lb: 2.0,
    pop: 3,
    kind: "other",
  },
  {
    sku: "GFT-CER",
    name: "Ceramic Starter Set",
    l: 12.0,
    w: 9.0,
    h: 4.0,
    lb: 3.5,
    pop: 2,
    kind: "other",
  },
  // Accessories
  { sku: "ACC-MATCH", name: "Matchbox", l: 3.0, w: 2.0, h: 0.8, lb: 0.1, pop: 6, kind: "other" },
  {
    sku: "ACC-MATCHL",
    name: "Long Matches",
    l: 7.0,
    w: 2.0,
    h: 0.8,
    lb: 0.15,
    pop: 3,
    kind: "other",
  },
  { sku: "ACC-TRIM", name: "Wick Trimmer", l: 7.0, w: 2.5, h: 1.0, lb: 0.3, pop: 3, kind: "other" },
  {
    sku: "ACC-SNUF",
    name: "Candle Snuffer",
    l: 8.0,
    w: 2.5,
    h: 1.5,
    lb: 0.3,
    pop: 2,
    kind: "other",
  },
  { sku: "ACC-DIP", name: "Wick Dipper", l: 6.5, w: 1.0, h: 0.5, lb: 0.1, pop: 1, kind: "other" },
  { sku: "ACC-COAST", name: "Coaster Set", l: 4.5, w: 4.5, h: 1.5, lb: 0.9, pop: 3, kind: "other" },
  { sku: "ACC-SPOON", name: "Spoon Rest", l: 5.0, w: 3.5, h: 1.0, lb: 0.4, pop: 2, kind: "other" },
  {
    sku: "ACC-INC",
    name: "Incense Holder",
    l: 9.0,
    w: 2.0,
    h: 1.0,
    lb: 0.3,
    pop: 2,
    kind: "other",
  },
  { sku: "ACC-TEA", name: "Tea Light Set", l: 6.0, w: 4.0, h: 1.5, lb: 0.6, pop: 3, kind: "other" },
  { sku: "ACC-RING", name: "Ring Dish", l: 4.0, w: 4.0, h: 1.0, lb: 0.3, pop: 3, kind: "other" },
  { sku: "TEA-POT", name: "Teapot", l: 9.0, w: 6.0, h: 6.0, lb: 2.5, pop: 2, kind: "other" },
];

/** The seller's current boxes, chosen "by guesswork". */
export const SAMPLE_CURRENT_BOXES = [
  { box_id: "Small 8x8x8", l: 8, w: 8, h: 8, cost: 0.85 },
  { box_id: "Medium 12x12x8", l: 12, w: 12, h: 8, cost: 1.35 },
  { box_id: "Large 16x12x12", l: 16, w: 12, h: 12, cost: 1.95 },
];

/** mulberry32: small deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rand: () => number, items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let r = rand() * total;
  for (const t of items) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return items[items.length - 1];
}

function itemCount(rand: () => number): number {
  const r = rand();
  if (r < 0.55) return 1;
  if (r < 0.8) return 2;
  if (r < 0.92) return 3;
  return 4 + Math.floor(rand() * 3); // 4–6
}

/** Day of year (0-based) with mild Q4 seasonality. */
function orderDay(rand: () => number, daysInYear: number): number {
  for (;;) {
    const d = Math.floor(rand() * daysInYear);
    const month = new Date(Date.UTC(SAMPLE_YEAR, 0, 1 + d)).getUTCMonth();
    const accept = month >= 9 ? 1 : month === 1 || month === 4 ? 0.8 : 0.6;
    if (rand() < accept) return d;
  }
}

function fmtDate(day: number): string {
  return new Date(Date.UTC(SAMPLE_YEAR, 0, 1 + day)).toISOString().slice(0, 10);
}

function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface SampleCsvs {
  products: string;
  orders: string;
  currentBoxes: string;
}

/** Build the three sample CSVs (deterministic for a given seed). */
export function generateSample(seed = SAMPLE_SEED, orderCount = SAMPLE_ORDERS): SampleCsvs {
  const rand = mulberry32(seed);
  const bySku = new Map(SAMPLE_PRODUCTS.map((p) => [p.sku, p]));
  const get = (sku: string): SampleProduct => {
    const p = bySku.get(sku);
    if (!p) throw new Error(`unknown sample SKU ${sku}`);
    return p;
  };

  const days: number[] = [];
  for (let i = 0; i < orderCount; i++) days.push(orderDay(rand, 365));
  days.sort((a, b) => a - b);

  const orderLines: string[] = ["order_id,sku,quantity,order_date"];
  for (let i = 0; i < orderCount; i++) {
    const n = itemCount(rand);
    const qty = new Map<string, number>();
    const add = (sku: string, q = 1) => qty.set(sku, (qty.get(sku) ?? 0) + q);

    const first = pickWeighted(rand, SAMPLE_PRODUCTS, (p) => p.pop);
    add(first.sku);
    let placed = 1;
    // Popular combos.
    if (placed < n && first.kind === "candle" && rand() < 0.5) {
      add(rand() < 0.8 ? "ACC-MATCH" : "ACC-TRIM");
      placed++;
    }
    if (placed < n && first.kind === "mug" && rand() < 0.6) {
      add(first.sku); // mug pair
      placed++;
    }
    if (placed < n && first.kind === "plate" && n >= 4 && rand() < 0.7) {
      add(first.sku, n - placed); // plate set
      placed = n;
    }
    while (placed < n) {
      const p = pickWeighted(rand, SAMPLE_PRODUCTS, (x) => x.pop);
      add(p.sku);
      placed++;
    }

    const orderId = String(10001 + i);
    const date = fmtDate(days[i]);
    for (const [sku, q] of qty) {
      get(sku);
      orderLines.push(`${orderId},${sku},${q},${date}`);
    }
  }

  const products = [
    "sku,name,length_in,width_in,height_in,weight_lb",
    ...SAMPLE_PRODUCTS.map(
      (p) => `${p.sku},${csvField(p.name)},${num(p.l)},${num(p.w)},${num(p.h)},${num(p.lb)}`,
    ),
  ].join("\n");

  const currentBoxes = [
    "box_id,length_in,width_in,height_in,unit_cost_usd",
    ...SAMPLE_CURRENT_BOXES.map((b) => `${b.box_id},${b.l},${b.w},${b.h},${num(b.cost)}`),
  ].join("\n");

  return {
    products: products + "\n",
    orders: orderLines.join("\n") + "\n",
    currentBoxes: currentBoxes + "\n",
  };
}

function main(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(here, "../web/public/sample");
  mkdirSync(outDir, { recursive: true });
  const csvs = generateSample();
  writeFileSync(path.join(outDir, "products.csv"), csvs.products);
  writeFileSync(path.join(outDir, "orders.csv"), csvs.orders);
  writeFileSync(path.join(outDir, "current_boxes.csv"), csvs.currentBoxes);
  console.log(`Sample store written to ${outDir}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
