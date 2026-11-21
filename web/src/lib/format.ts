/** Number formatting for the UI. */

export function usd(v: number, digits = 0): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function num(v: number, digits = 0): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(v: number, digits = 0): string {
  return `${v.toFixed(digits)}%`;
}

/** Compact number: 12.3k, 1.2M. */
export function compact(v: number): string {
  return v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}
