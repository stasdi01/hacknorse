"use client";

import { useWorkbench } from "./state";

export function ResultsStep() {
  const wb = useWorkbench();
  const r = wb.report;
  if (!r) return null;
  return (
    <div data-testid="results">
      Savings: ${Math.round(r.summary.savings_usd).toLocaleString()} per year
    </div>
  );
}
