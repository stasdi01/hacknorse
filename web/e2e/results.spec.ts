import { expect, test } from "@playwright/test";

test("results dashboard shows every section for the sample store", async ({ page }) => {
  await page.goto("/app?sample=1");
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("kpi-air")).toContainText("Air shipped");
  await expect(page.getByTestId("kpi-air")).toContainText("→");
  await expect(page.getByTestId("kpi-void")).toContainText("Void fill needed");
  for (const id of [
    "kpi-air",
    "kpi-void",
    "kpi-secondary",
    "kpi-empty",
    "kpi-savings",
    "kpi-cardboard",
    "kpi-volume",
    "before-after-chart",
    "k-curve",
    "recommended-boxes",
    "orders-table",
    "flagged-panel",
    "viewer-3d",
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await expect(page.getByTestId("recommended-table").locator("tbody tr")).toHaveCount(4);
  await expect(page.getByTestId("k-curve").locator("svg").first()).toBeVisible();

  // Metric display toggle converts units.
  await page.getByTestId("units-metric").click();
  await expect(page.getByTestId("kpi-cardboard")).toContainText("kg");
  await expect(page.getByTestId("kpi-void")).toContainText("m³");
  await expect(page.getByTestId("recommended-table")).toContainText("cm");

  // Changing K re-runs the optimizer.
  await page.getByTestId("k-slider").getByRole("slider").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("recommended-table").locator("tbody tr")).toHaveCount(5, {
    timeout: 30_000,
  });
});

test("3D viewer shows the current and recommended box for a chosen order", async ({ page }) => {
  await page.goto("/app?sample=1");
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("viewer-before").locator("canvas")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("viewer-after").locator("canvas")).toBeVisible();

  await page.getByTestId("viewer-select").click();
  await page.getByRole("option", { name: /2 × Moss Mug 12oz/ }).click();
  await expect(page.getByTestId("viewer-after")).toContainText("empty");
  await expect(page.getByTestId("viewer-3d")).toContainText("2 × Moss Mug 12oz");

  // The eye button in the orders table selects an order for the viewer.
  await page.getByRole("button", { name: "View in 3D" }).nth(1).click();
  await expect(page.getByTestId("viewer-select")).toContainText("#2 ·");
});
