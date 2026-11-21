import { expect, test } from "@playwright/test";

test("method page runs brute-force validation and shows the gap", async ({ page }) => {
  await page.goto("/method");
  await expect(page.getByTestId("pipeline")).toBeVisible();
  await expect(page.getByTestId("assumptions-table")).toContainText("DIM divisor");
  const table = page.getByTestId("validation-table");
  await expect(table).toBeVisible({ timeout: 30_000 });
  await expect(table).toContainText("2,300");
  await expect(page.getByTestId("gap-k2")).toHaveText(/^\d+\.\d\d%$/);
  await expect(page.getByTestId("gap-k3")).toHaveText(/^\d+\.\d\d%$/);
});
