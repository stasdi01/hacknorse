"use client";

import { ArrowRight, DollarSign, Leaf, Package, Wind } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Report } from "@/engine/types";
import {
  displayVolumeFt3,
  displayWeight,
  volumeLabel,
  weightLabel,
  type UnitSystem,
} from "@/lib/data/units";
import { num, pct, usd } from "@/lib/format";

function Kpi({
  icon: Icon,
  label,
  children,
  sub,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  sub: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId} className="gap-2">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4 text-kraft" aria-hidden />
          {label}
        </div>
        <div className="text-3xl font-semibold tracking-tight tabular-nums">{children}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function signed(v: number, fmt: (x: number) => string): string {
  return v >= 0 ? fmt(v) : `−${fmt(-v)}`;
}

/** Relative change, e.g. "−18%" or "+3%". */
function change(before: number, after: number): string {
  if (before <= 0) return "—";
  const p = ((after - before) / before) * 100;
  return `${p <= 0 ? "−" : "+"}${Math.abs(p).toFixed(0)}%`;
}

/** "1,234 → 987" in the display volume unit. */
function BeforeAfter({ before, after, unit }: { before: string; after: string; unit: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-muted-foreground">{before}</span>
      <ArrowRight className="size-5 self-center text-muted-foreground" aria-hidden />
      <span className="sr-only"> → </span>
      <span className="text-leaf">{after}</span>
      <span className="text-lg font-normal text-muted-foreground">{unit}</span>
    </span>
  );
}

export function KpiCards({ report, units }: { report: Report; units: UnitSystem }) {
  const s = report.summary;
  const b = s.baseline;
  const o = s.optimized;
  const perYear = report.annualization.assumed_one_year
    ? "per dataset (treated as 1 year)"
    : "per year";
  const vol = (ft3: number) => num(displayVolumeFt3(ft3, units), units === "metric" ? 1 : 0);
  const cardboardPct = b.cardboard_lb > 0 ? (s.cardboard_saved_lb / b.cardboard_lb) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="kpi-cards">
        <Kpi
          icon={Wind}
          label={`Air shipped ${perYear} (${volumeLabel(units)})`}
          sub={`${change(b.air_ft3, o.air_ft3)} air in boxes: box volume not taken by products.`}
          testId="kpi-air"
        >
          <BeforeAfter before={vol(b.air_ft3)} after={vol(o.air_ft3)} unit="" />
        </Kpi>
        <Kpi
          icon={Package}
          label={`Void fill needed ${perYear}`}
          sub={`${change(b.void_fill_ft3, o.void_fill_ft3)} fill material; ${usd(b.void_fill_usd)} → ${usd(o.void_fill_usd)} at ${usd(report.settings.void_fill_usd_per_ft3, 2)}/ft³.`}
          testId="kpi-void"
        >
          <BeforeAfter
            before={vol(b.void_fill_ft3)}
            after={vol(o.void_fill_ft3)}
            unit={volumeLabel(units)}
          />
        </Kpi>
        <Kpi
          icon={DollarSign}
          label="Saved on shipping, boxes and fill"
          sub={`${signed(s.savings_pct, (v) => pct(v, 1))} of total cost, ${perYear}.`}
          testId="kpi-savings"
        >
          <span className={s.savings_usd >= 0 ? "text-leaf" : ""}>
            {signed(s.savings_usd, (v) => usd(v))}
          </span>
        </Kpi>
        <Kpi
          icon={Leaf}
          label="Cardboard saved"
          sub={`${signed(cardboardPct, (v) => pct(v, 0))} less corrugated board, ${perYear}.`}
          testId="kpi-cardboard"
        >
          {signed(displayWeight(s.cardboard_saved_lb, units), (v) => num(v))}{" "}
          <span className="text-lg font-normal text-muted-foreground">{weightLabel(units)}</span>
        </Kpi>
      </div>
      <dl
        className="flex flex-wrap gap-x-8 gap-y-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
        data-testid="kpi-secondary"
      >
        <div className="flex gap-2" data-testid="kpi-empty">
          <dt className="text-muted-foreground">Empty space (share of box volume):</dt>
          <dd className="tabular-nums">
            {pct(b.empty_space_pct)} → {pct(o.empty_space_pct)}
          </dd>
        </div>
        <div className="flex gap-2" data-testid="kpi-volume">
          <dt className="text-muted-foreground">Total box volume shipped:</dt>
          <dd className="tabular-nums">
            {vol(b.shipped_ft3)} → {vol(o.shipped_ft3)} {volumeLabel(units)} (
            {change(b.shipped_ft3, o.shipped_ft3)})
          </dd>
        </div>
      </dl>
    </div>
  );
}
