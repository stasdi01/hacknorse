/** Unit conversion. Internal units are inches and pounds. */

export type LengthUnit = "in" | "cm" | "mm";
export type WeightUnit = "lb" | "kg" | "g" | "oz";
export type UnitSystem = "imperial" | "metric";

export const CM_PER_IN = 2.54;
export const KG_PER_LB = 0.45359237;

export function toInches(value: number, unit: LengthUnit): number {
  switch (unit) {
    case "in":
      return value;
    case "cm":
      return value / CM_PER_IN;
    case "mm":
      return value / (CM_PER_IN * 10);
  }
}

export function toPounds(value: number, unit: WeightUnit): number {
  switch (unit) {
    case "lb":
      return value;
    case "kg":
      return value / KG_PER_LB;
    case "g":
      return value / (KG_PER_LB * 1000);
    case "oz":
      return value / 16;
  }
}

/** Length in the display system (in or cm). */
export function displayLength(inches: number, system: UnitSystem): number {
  return system === "metric" ? inches * CM_PER_IN : inches;
}

/** Weight in the display system (lb or kg). */
export function displayWeight(pounds: number, system: UnitSystem): number {
  return system === "metric" ? pounds * KG_PER_LB : pounds;
}

/** Volume in the display system (ft³ or m³), from ft³. */
export function displayVolumeFt3(ft3: number, system: UnitSystem): number {
  return system === "metric" ? ft3 * 0.028316846592 : ft3;
}

export function lengthLabel(system: UnitSystem): string {
  return system === "metric" ? "cm" : "in";
}

export function weightLabel(system: UnitSystem): string {
  return system === "metric" ? "kg" : "lb";
}

export function volumeLabel(system: UnitSystem): string {
  return system === "metric" ? "m³" : "ft³";
}

/** "10 × 8 × 6 in" or "25.4 × 20.3 × 15.2 cm". */
export function formatDims(l: number, w: number, h: number, system: UnitSystem): string {
  const f = (v: number) => {
    const d = displayLength(v, system);
    return system === "metric" ? d.toFixed(1) : String(Math.round(d * 100) / 100);
  };
  return `${f(l)} × ${f(w)} × ${f(h)} ${lengthLabel(system)}`;
}

/** Guess a length unit from a column name ("Length (cm)" → cm). */
export function guessLengthUnit(header: string): LengthUnit | null {
  const h = header.toLowerCase();
  if (/\bmm\b|millimet/.test(h)) return "mm";
  if (/\bcm\b|centimet|_cm\b|\(cm\)/.test(h)) return "cm";
  if (/\bin\b|inch|_in\b|\(in\)/.test(h)) return "in";
  return null;
}

/** Guess a weight unit from a column name ("Variant Grams" → g). */
export function guessWeightUnit(header: string): WeightUnit | null {
  const h = header.toLowerCase();
  if (/\bkg\b|kilo|_kg\b/.test(h)) return "kg";
  if (/gram|\bg\b|_g\b/.test(h)) return "g";
  if (/\boz\b|ounce|_oz\b/.test(h)) return "oz";
  if (/\blbs?\b|pound|_lbs?\b/.test(h)) return "lb";
  return null;
}
