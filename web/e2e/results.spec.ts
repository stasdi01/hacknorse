import { expect, test } from "@playwright/test";

test("results dashboard shows every section for the sample store", async ({ page }) => {
  await page.goto("/app?sample=1");
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
  for (const id of [
    "kpi-empty",
    "kpi-savings",
    "kpi-cardboard",
    "kpi-volume",
    "before-after-chart",
    "k-curve",
    "recommended-boxes",
    "orders-table",
    "flagged-panel",
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await expect(page.getByTestId("recommended-table").locator("tbody tr")).toHaveCount(4);
  await expect(page.getByTestId("k-curve").locator("svg").first()).toBeVisible();

  // Metric display toggle converts units.
  await page.getByTestId("units-metric").click();
  await expect(page.getByTestId("kpi-cardboard")).toContainText("kg");
  await expect(page.getByTestId("recommended-table")).toContainText("cm");

  // Changing K re-runs the optimizer.
  await page.getByTestId("k-slider").getByRole("slider").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("recommended-table").locator("tbody tr")).toHaveCount(5, {
    timeout: 30_000,
  });
});
