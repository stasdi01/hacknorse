import { expect, test } from "@playwright/test";

test("custom mode designs custom box sizes within the time target", async ({ page }) => {
  await page.goto("/app?sample=1");
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByTestId("mode-custom").click();
  const start = Date.now();
  await page.getByTestId("run-optimizer").click();
  await expect(page.getByTestId("results")).toContainText("Custom sizes", { timeout: 30_000 });
  expect(Date.now() - start).toBeLessThan(10_000);
  await expect(page.getByTestId("recommended-table")).toContainText("custom");
  await expect(page.getByTestId("recommended-boxes")).toContainText("minimum order quantity");
});
