import { describe, expect, it } from "vitest";
import { APP_NAME } from "./app";

describe("app config", () => {
  it("has a non-empty app name", () => {
    expect(APP_NAME.length).toBeGreaterThan(0);
  });
});
