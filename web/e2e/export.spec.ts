import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("exports buying list, packing guide and a print report", async ({ page }) => {
  await page.goto("/app?sample=1");
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 30_000 });

  const [buying] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-buying-list").click(),
  ]);
  expect(buying.suggestedFilename()).toBe("buying-list-k4.csv");
  const buyingCsv = readFileSync(await buying.path(), "utf8");
  expect(buyingCsv.split("\n")[0]).toContain("suggested_quantity_per_year");
  expect(buyingCsv.trim().split("\n")).toHaveLength(5);

  const [guide] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-packing-guide").click(),
  ]);
  const guideCsv = readFileSync(await guide.path(), "utf8");
  expect(guideCsv.split("\n")[0]).toContain("recommended_box");
  expect(guideCsv.trim().split("\n").length).toBeGreaterThan(100);

  await page.getByTestId("open-report").click();
  const report = page.getByTestId("print-report");
  await expect(report).toContainText("Boxes to buy");
  await expect(report).toContainText("Packing guide");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("print-button")).toBeHidden();
  await expect(page.locator("header").first()).toBeHidden();
});
