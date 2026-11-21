import { describe, expect, it } from "vitest";
import {
  displayLength,
  displayWeight,
  formatDims,
  guessLengthUnit,
  guessWeightUnit,
  toInches,
  toPounds,
} from "./units";

describe("unit conversion", () => {
  it("converts lengths to inches", () => {
    expect(toInches(2.54, "cm")).toBeCloseTo(1, 12);
    expect(toInches(25.4, "mm")).toBeCloseTo(1, 12);
    expect(toInches(3, "in")).toBe(3);
  });

  it("converts weights to pounds", () => {
    expect(toPounds(1, "kg")).toBeCloseTo(2.20462262, 6);
    expect(toPounds(453.59237, "g")).toBeCloseTo(1, 9);
    expect(toPounds(16, "oz")).toBe(1);
  });

  it("round-trips through the metric display", () => {
    expect(displayLength(toInches(30, "cm"), "metric")).toBeCloseTo(30, 9);
    expect(displayWeight(toPounds(2, "kg"), "metric")).toBeCloseTo(2, 9);
    expect(displayLength(10, "imperial")).toBe(10);
  });

  it("formats box dimensions", () => {
    expect(formatDims(10, 8, 6, "imperial")).toBe("10 × 8 × 6 in");
    expect(formatDims(10, 8, 6, "metric")).toBe("25.4 × 20.3 × 15.2 cm");
  });

  it("guesses units from headers", () => {
    expect(guessLengthUnit("Length (cm)")).toBe("cm");
    expect(guessLengthUnit("length_in")).toBe("in");
    expect(guessLengthUnit("Length")).toBeNull();
    expect(guessWeightUnit("Variant Grams")).toBe("g");
    expect(guessWeightUnit("weight_lb")).toBe("lb");
    expect(guessWeightUnit("Weight (kg)")).toBe("kg");
  });
});
