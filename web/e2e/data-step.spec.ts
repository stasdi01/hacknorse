import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const sampleDir = path.resolve(__dirname, "../public/sample");

/** The sample CSVs with Shopify-style / renamed headers. */
function renamed(): { products: string; orders: string; boxes: string } {
  const swapHeader = (file: string, header: string) => {
    const lines = readFileSync(path.join(sampleDir, file), "utf8").split("\n");
    lines[0] = header;
    return lines.join("\n");
  };
  return {
    products: swapHeader(
      "products.csv",
      "Product Code,Title,Length (in),Width (in),Height (in),Weight (lb)",
    ),
    orders: swapHeader("orders.csv", "Name,Lineitem sku,Lineitem quantity,Created at"),
    boxes: swapHeader("current_boxes.csv", "Box,L,W,H,Cost"),
  };
}

test("upload CSVs with renamed columns, map automatically, and run", async ({ page }) => {
  const files = renamed();
  await page.goto("/app");
  for (const [kind, text] of [
    ["products", files.products],
    ["orders", files.orders],
    ["boxes", files.boxes],
  ] as const) {
    await page.getByTestId(`file-input-${kind}`).setInputFiles({
      name: `${kind}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(text),
    });
  }
  await expect(page.getByTestId("file-slot-orders")).toContainText("rows");
  await page.getByTestId("to-mapping").click();

  await expect(page.getByTestId("map-orders-order_id")).toContainText("Name");
  await expect(page.getByTestId("map-orders-sku")).toContainText("Lineitem sku");
  await expect(page.getByTestId("map-orders-quantity")).toContainText("Lineitem quantity");
  await expect(page.getByTestId("map-products-sku")).toContainText("Product Code");
  await expect(page.getByTestId("map-boxes-length")).toContainText("L");
  await expect(page.getByTestId("count-products")).toContainText("40 valid");
  await expect(page.getByTestId("validation-report")).toContainText("Ready");

  await page.getByTestId("to-settings").click();
  await page.getByTestId("run-optimizer").click();
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
});

test("load the sample store from the data step", async ({ page }) => {
  await page.goto("/app");
  await page.getByTestId("load-sample").click();
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
});
