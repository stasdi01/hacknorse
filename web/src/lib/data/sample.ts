/** The synthetic "Fern & Kiln" sample store shipped in /public/sample. */
import { buildDataset, prepareFile, type DatasetFiles } from "./dataset";

export const SAMPLE_STORE_NAME = "Fern & Kiln (synthetic sample data)";

export interface SampleTexts {
  products: string;
  orders: string;
  boxes: string;
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.text();
}

/** Fetch the sample CSV texts. */
export async function fetchSampleTexts(): Promise<SampleTexts> {
  const [products, orders, boxes] = await Promise.all([
    fetchText("/sample/products.csv"),
    fetchText("/sample/orders.csv"),
    fetchText("/sample/current_boxes.csv"),
  ]);
  return { products, orders, boxes };
}

/** Parse and auto-map the sample CSVs. */
export function sampleFiles(texts: SampleTexts): DatasetFiles {
  return {
    products: prepareFile("products", texts.products),
    orders: prepareFile("orders", texts.orders),
    boxes: prepareFile("boxes", texts.boxes),
  };
}

/** Fetch the sample store and build the engine input. */
export async function loadSampleDataset() {
  return buildDataset(sampleFiles(await fetchSampleTexts()));
}
