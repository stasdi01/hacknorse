import { expect, test } from "@playwright/test";

test("engine version is served from WASM inside the Web Worker", async ({ page }) => {
  await page.goto("/dev");
  await expect(page.getByTestId("engine-version")).toHaveText(/^\d+\.\d+\.\d+$/, {
    timeout: 20_000,
  });
});

test("optimize() runs on the sample store inside the worker", async ({ page }) => {
  await page.goto("/dev");
  await page.getByTestId("run-sample").click();
  const report = page.getByTestId("engine-report");
  await expect(report).toBeVisible({ timeout: 30_000 });
  await expect(report).toContainText('"savings_usd"');
  await expect(page.getByTestId("engine-stage")).toHaveText("Done");
});
