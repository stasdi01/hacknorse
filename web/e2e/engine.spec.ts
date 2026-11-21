import { expect, test } from "@playwright/test";

test("engine version is served from WASM inside the Web Worker", async ({ page }) => {
  await page.goto("/dev");
  await expect(page.getByTestId("engine-version")).toHaveText(/^\d+\.\d+\.\d+$/, {
    timeout: 20_000,
  });
});
