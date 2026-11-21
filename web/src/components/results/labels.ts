import type { Product, SignatureItem } from "@/engine/types";

/** "2 × Amber Candle 8oz + Matchbox" */
export function signatureLabel(items: SignatureItem[], names: ReadonlyMap<string, string>): string {
  return items
    .map((it) => `${it.quantity > 1 ? `${it.quantity} × ` : ""}${names.get(it.sku) ?? it.sku}`)
    .join(" + ");
}

export function productNames(products: Product[] | undefined): Map<string, string> {
  return new Map((products ?? []).map((p) => [p.sku, p.name || p.sku]));
}
