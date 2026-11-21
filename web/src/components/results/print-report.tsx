"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/app";
import type { Report } from "@/engine/types";
import {
  displayVolumeFt3,
  displayWeight,
  formatDims,
  lengthLabel,
  volumeLabel,
  weightLabel,
  type UnitSystem,
} from "@/lib/data/units";
import { num, pct, usd } from "@/lib/format";
import { signatureLabel } from "./labels";

const th = "border-b border-neutral-300 px-2 py-1.5 text-left font-medium";
const td = "border-b border-neutral-200 px-2 py-1.5";
const tdr = `${td} text-right tabular-nums`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

interface Props {
  report: Report;
  names: ReadonlyMap<string, string>;
  units: UnitSystem;
  storeLabel: string | null;
  onBack: () => void;
}

export function PrintReport({ report: r, names, units, storeLabel, onBack }: Props) {
  const s = r.summary;
  const w = (lb: number) => `${num(displayWeight(lb, units))} ${weightLabel(units)}`;
  const v = (ft3: number) =>
    `${num(displayVolumeFt3(ft3, units), units === "metric" ? 1 : 0)} ${volumeLabel(units)}`;
  const perYear = r.annualization.assumed_one_year
    ? "Totals are for the dataset, treated as one year (no order dates)."
    : `Totals are scaled to one year from ${num(r.annualization.period_days ?? 0)} days of orders.`;
  const flaggedCount = (reason: string) =>
    r.flagged.filter((f) => f.reason === reason).reduce((n, f) => n + f.count, 0);

  return (
    <div
      className="mx-auto max-w-4xl space-y-8 bg-white p-6 text-sm text-neutral-900 print:p-0"
      data-testid="print-report"
    >
      <div className="no-print flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back to results
        </Button>
        <Button onClick={() => window.print()} data-testid="print-button">
          <Printer aria-hidden /> Print / Save as PDF
        </Button>
      </div>

      <header className="space-y-1 border-b-2 border-kraft pb-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {APP_NAME} · box-set report
        </p>
        <h1 className="text-2xl font-semibold">
          Recommended {r.settings.k} box sizes{storeLabel ? ` for ${storeLabel}` : ""}
        </h1>
        <p className="text-neutral-600">
          {new Date().toLocaleDateString("en-US", { dateStyle: "long" })} ·{" "}
          {r.settings.mode === "custom" ? "custom sizes" : "stock catalog"} · padding{" "}
          {num(units === "metric" ? r.settings.padding_in * 2.54 : r.settings.padding_in, 2)}{" "}
          {lengthLabel(units)} · {r.settings.carrier === "usps" ? "USPS-style" : "UPS/FedEx-style"}{" "}
          DIM · {r.stats.orders_used.toLocaleString()} orders
        </p>
      </header>

      <Section title="Summary">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Per year</th>
              <th className={`${th} text-right`}>Current boxes</th>
              <th className={`${th} text-right`}>Recommended</th>
              <th className={`${th} text-right`}>Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={td}>Shipping + boxes</td>
              <td className={tdr}>{usd(s.baseline.total_usd)}</td>
              <td className={tdr}>{usd(s.optimized.total_usd)}</td>
              <td className={tdr}>
                −{usd(s.savings_usd)} ({pct(s.savings_pct, 1)})
              </td>
            </tr>
            <tr>
              <td className={td}>Empty space in boxes</td>
              <td className={tdr}>{pct(s.baseline.empty_space_pct)}</td>
              <td className={tdr}>{pct(s.optimized.empty_space_pct)}</td>
              <td className={tdr}>
                {num(s.optimized.empty_space_pct - s.baseline.empty_space_pct, 1)} pts
              </td>
            </tr>
            <tr>
              <td className={td}>Cardboard</td>
              <td className={tdr}>{w(s.baseline.cardboard_lb)}</td>
              <td className={tdr}>{w(s.optimized.cardboard_lb)}</td>
              <td className={tdr}>−{w(s.cardboard_saved_lb)}</td>
            </tr>
            <tr>
              <td className={td}>Shipped volume</td>
              <td className={tdr}>{v(s.baseline.shipped_ft3)}</td>
              <td className={tdr}>{v(s.optimized.shipped_ft3)}</td>
              <td className={tdr}>−{v(s.shipped_ft3_saved)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-neutral-500">
          {perYear} Compared on {Math.round(s.baseline.orders).toLocaleString()} orders per year
          that both box sets can ship. Shipping rates are illustrative.
        </p>
      </Section>

      <Section title="Boxes to buy">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Box</th>
              <th className={th}>Inside dimensions</th>
              <th className={`${th} text-right`}>Unit cost (est.)</th>
              <th className={`${th} text-right`}>Quantity / yr</th>
              <th className={`${th} text-right`}>Share</th>
            </tr>
          </thead>
          <tbody>
            {r.recommended.map((b) => (
              <tr key={b.box_id}>
                <td className={td}>{b.box_id}</td>
                <td className={td}>{formatDims(b.length_in, b.width_in, b.height_in, units)}</td>
                <td className={tdr}>{usd(b.unit_cost_usd, 2)}</td>
                <td className={tdr}>{Math.ceil(b.orders - 1e-9).toLocaleString()}</td>
                <td className={tdr}>{pct(b.orders_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Cost by number of box sizes">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>K</th>
              <th className={`${th} text-right`}>Total / yr</th>
              <th className={`${th} text-right`}>Empty space</th>
              <th className={th}>Boxes</th>
            </tr>
          </thead>
          <tbody>
            {r.curve.map((p) => (
              <tr
                key={p.k}
                className={p.k === r.settings.k ? "bg-kraft-light print:bg-neutral-100" : ""}
              >
                <td className={td}>{p.k}</td>
                <td className={tdr}>{usd(p.total_usd)}</td>
                <td className={tdr}>{pct(p.empty_space_pct)}</td>
                <td className={`${td} text-xs`}>{p.box_ids.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Packing guide: 20 most frequent orders">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Order contents</th>
              <th className={`${th} text-right`}>Orders / yr</th>
              <th className={th}>Use box</th>
              <th className={`${th} text-right`}>Empty space</th>
            </tr>
          </thead>
          <tbody>
            {r.assignments.slice(0, 20).map((a) => (
              <tr key={a.signature_id}>
                <td className={td}>{signatureLabel(a.items, names)}</td>
                <td className={tdr}>
                  {Math.round(a.count * r.annualization.factor).toLocaleString()}
                </td>
                <td className={td}>{a.optimized?.box_id ?? "needs 2+ boxes"}</td>
                <td className={tdr}>{a.optimized ? pct(a.optimized.empty_space_pct) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-neutral-500">The full list is in the packing guide CSV.</p>
      </Section>

      <Section title="Flagged orders">
        <ul className="list-disc pl-5">
          <li>Fit none of the current boxes: {flaggedCount("fits_no_current_box")}</li>
          <li>Need 2+ boxes (fit no candidate): {flaggedCount("fits_no_candidate")}</li>
          <li>More than 40 items (excluded): {flaggedCount("too_many_items")}</li>
        </ul>
      </Section>

      <footer className="border-t border-neutral-300 pt-3 text-xs text-neutral-500">
        Generated by {APP_NAME} in the browser (engine {r.engine_version}). Box prices are
        estimates; DIM divisors, board weight and rates are assumptions to verify with your carrier
        and supplier.
      </footer>
    </div>
  );
}
