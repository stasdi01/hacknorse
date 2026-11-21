/**
 * Column mapping: match users' CSV headers to our fields with normalized
 * names and a synonym list (e.g. "Lineitem sku" → sku, "Name" → order_id).
 */

export type FileKind = "products" | "orders" | "boxes";

export type Field =
  | "sku"
  | "name"
  | "length"
  | "width"
  | "height"
  | "weight"
  | "order_id"
  | "quantity"
  | "date"
  | "box_id"
  | "unit_cost";

export interface FieldDef {
  field: Field;
  label: string;
  required: boolean;
  /** Normalized synonyms, best first. */
  synonyms: string[];
}

const DIMS = {
  length: ["length", "lengthin", "lengthinches", "lengthcm", "lengthmm", "len", "l", "depth"],
  width: ["width", "widthin", "widthinches", "widthcm", "widthmm", "wid", "w"],
  height: ["height", "heightin", "heightinches", "heightcm", "heightmm", "ht", "h"],
};

export const FIELD_DEFS: Record<FileKind, FieldDef[]> = {
  products: [
    {
      field: "sku",
      label: "SKU",
      required: true,
      synonyms: [
        "sku",
        "variantsku",
        "productsku",
        "itemsku",
        "skucode",
        "productcode",
        "itemcode",
        "partnumber",
        "productid",
      ],
    },
    {
      field: "name",
      label: "Name",
      required: false,
      synonyms: ["name", "productname", "title", "producttitle", "itemname", "description"],
    },
    { field: "length", label: "Length", required: true, synonyms: DIMS.length },
    { field: "width", label: "Width", required: true, synonyms: DIMS.width },
    { field: "height", label: "Height", required: true, synonyms: DIMS.height },
    {
      field: "weight",
      label: "Weight",
      required: true,
      synonyms: [
        "weight",
        "weightlb",
        "weightlbs",
        "weightkg",
        "weightg",
        "weightoz",
        "variantgrams",
        "grams",
        "wt",
        "shippingweight",
      ],
    },
  ],
  orders: [
    {
      field: "order_id",
      label: "Order ID",
      required: true,
      synonyms: [
        "orderid",
        "ordernumber",
        "orderno",
        "order",
        "name",
        "ordername",
        "salesorder",
        "id",
      ],
    },
    {
      field: "sku",
      label: "SKU",
      required: true,
      synonyms: [
        "sku",
        "lineitemsku",
        "itemsku",
        "productsku",
        "variantsku",
        "productcode",
        "itemcode",
      ],
    },
    {
      field: "quantity",
      label: "Quantity",
      required: true,
      synonyms: [
        "quantity",
        "lineitemquantity",
        "qty",
        "units",
        "count",
        "itemquantity",
        "quantityordered",
      ],
    },
    {
      field: "date",
      label: "Order date",
      required: false,
      synonyms: [
        "orderdate",
        "date",
        "createdat",
        "created",
        "paidat",
        "orderedat",
        "placedat",
        "datecreated",
        "saledate",
      ],
    },
  ],
  boxes: [
    {
      field: "box_id",
      label: "Box ID",
      required: true,
      synonyms: ["boxid", "box", "boxname", "name", "id", "code", "size"],
    },
    { field: "length", label: "Length", required: true, synonyms: DIMS.length },
    { field: "width", label: "Width", required: true, synonyms: DIMS.width },
    { field: "height", label: "Height", required: true, synonyms: DIMS.height },
    {
      field: "unit_cost",
      label: "Unit cost (USD)",
      required: false,
      synonyms: ["unitcostusd", "unitcost", "cost", "costusd", "price", "priceusd", "unitprice"],
    },
  ],
};

/** field → header index (or null when not mapped). */
export type ColumnMapping = Partial<Record<Field, number | null>>;

/** Lowercase and keep only letters and digits. */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Strip unit hints so "length_in" / "Length (cm)" both normalize to "length". */
function stripUnits(n: string): string {
  return n.replace(/(inches|inch|in|cm|mm|lbs|lb|kg|oz|grams|g|usd)$/, "");
}

/**
 * Suggest a mapping for the headers of one file.
 * Pass 1: exact normalized synonym match (best synonym wins).
 * Pass 2: header with unit suffix removed matches a synonym.
 * Pass 3: header contains a synonym of 3+ letters.
 * Each header is used at most once; fields are matched in definition order.
 */
export function autoMap(kind: FileKind, headers: string[]): ColumnMapping {
  const defs = FIELD_DEFS[kind];
  const norm = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: ColumnMapping = {};

  const passes: ((h: string, syn: string) => boolean)[] = [
    (h, syn) => h === syn,
    (h, syn) => stripUnits(h) === syn && stripUnits(h).length > 0,
    (h, syn) => syn.length >= 3 && h.includes(syn),
  ];

  for (const pass of passes) {
    for (const def of defs) {
      if (mapping[def.field] !== undefined) continue;
      let found: number | null = null;
      for (const syn of def.synonyms) {
        const idx = norm.findIndex((h, i) => !used.has(i) && pass(h, syn));
        if (idx >= 0) {
          found = idx;
          break;
        }
      }
      if (found !== null) {
        mapping[def.field] = found;
        used.add(found);
      }
    }
  }
  for (const def of defs) {
    if (mapping[def.field] === undefined) mapping[def.field] = null;
  }
  return mapping;
}

/** Required fields that are not mapped. */
export function missingRequired(kind: FileKind, mapping: ColumnMapping): FieldDef[] {
  return FIELD_DEFS[kind].filter(
    (d) => d.required && (mapping[d.field] === null || mapping[d.field] === undefined),
  );
}
