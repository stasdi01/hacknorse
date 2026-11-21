import { expect, test } from "@playwright/test";

test("landing → Try with a sample store → results with KPI cards and the 3D viewer", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ship air");
  await page.getByTestId("try-sample").click();
  await expect(page).toHaveURL(/\/app\?sample=1/);
  await expect(page.getByTestId("kpi-cards")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("kpi-savings")).toContainText("$");
  await expect(page.getByTestId("viewer-after").locator("canvas")).toBeVisible({ timeout: 20_000 });
});

test("pages have no horizontal scroll at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/", "/app"]) {
    await page.goto(url);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
});
