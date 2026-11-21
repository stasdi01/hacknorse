/** CSV parsing (Papa Parse) and CSV writing. */
import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** Parse CSV text into headers + rows of strings (empty lines skipped). */
export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    skipEmptyLines: "greedy",
  });
  const [headerRow, ...rows] = result.data;
  const headers = (headerRow ?? []).map((h) => h.trim());
  return { headers, rows: rows.map((r) => r.map((c) => (c ?? "").trim())) };
}

/** Serialize rows to CSV text. */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return Papa.unparse({ fields: headers, data: rows.map((r) => r.map(String)) }, { newline: "\n" });
}
