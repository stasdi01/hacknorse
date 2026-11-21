"use client";

import { ArrowRight, Box, DollarSign, Leaf, Truck } from "lucide-react";
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

export function KpiCards({ report, units }: { report: Report; units: UnitSystem }) {
  const s = report.summary;
  const perYear = report.annualization.assumed_one_year
    ? "per dataset (treated as 1 year)"
    : "per year";
  const cardboardPct =
    s.baseline.cardboard_lb > 0 ? (s.cardboard_saved_lb / s.baseline.cardboard_lb) * 100 : 0;
  const volumePct =
    s.baseline.shipped_ft3 > 0 ? (s.shipped_ft3_saved / s.baseline.shipped_ft3) * 100 : 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="kpi-cards">
      <Kpi
        icon={Box}
        label="Empty space in boxes"
        sub="Share of box volume that is air (fill)."
        testId="kpi-empty"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">{pct(s.baseline.empty_space_pct)}</span>
          <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
          <span className="text-leaf">{pct(s.optimized.empty_space_pct)}</span>
        </span>
      </Kpi>
      <Kpi
        icon={DollarSign}
        label="Saved on shipping + boxes"
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
      <Kpi
        icon={Truck}
        label="Shipped volume saved"
        sub={`${signed(volumePct, (v) => pct(v, 0))} less space in trucks, ${perYear}.`}
        testId="kpi-volume"
      >
        {signed(displayVolumeFt3(s.shipped_ft3_saved, units), (v) =>
          num(v, units === "metric" ? 1 : 0),
        )}{" "}
        <span className="text-lg font-normal text-muted-foreground">{volumeLabel(units)}</span>
      </Kpi>
    </div>
  );
}
