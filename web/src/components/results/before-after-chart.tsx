"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Report } from "@/engine/types";
import {
  displayVolumeFt3,
  displayWeight,
  volumeLabel,
  weightLabel,
  type UnitSystem,
} from "@/lib/data/units";
import { CHART } from "@/lib/chart-colors";
import { compact, usd } from "@/lib/format";

interface Panel {
  title: string;
  before: number;
  after: number;
  fmt: (v: number) => string;
}

function MiniBars({ panel }: { panel: Panel }) {
  const data = [
    { name: "Before", value: panel.before, color: CHART.before },
    { name: "After", value: panel.after, color: CHART.after },
  ];
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-sm font-medium">{panel.title}</figcaption>
      <BarChart
        width={220}
        height={200}
        data={data}
        margin={{ top: 24, right: 8, bottom: 0, left: 8 }}
        style={{ width: "100%", maxWidth: 260, height: 200 }}
        responsive
      >
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: CHART.axis, fontSize: 12 }}
        />
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          formatter={(v) => [panel.fmt(Number(v)), panel.title]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => panel.fmt(Number(v))}
            style={{ fill: "#2b2620", fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </figure>
  );
}

export function BeforeAfterChart({ report, units }: { report: Report; units: UnitSystem }) {
  const s = report.summary;
  const panels: Panel[] = [
    {
      title: "Shipping + boxes ($/yr)",
      before: s.baseline.total_usd,
      after: s.optimized.total_usd,
      fmt: (v) => `$${compact(v)}`,
    },
    {
      title: `Cardboard (${weightLabel(units)}/yr)`,
      before: displayWeight(s.baseline.cardboard_lb, units),
      after: displayWeight(s.optimized.cardboard_lb, units),
      fmt: compact,
    },
    {
      title: `Shipped volume (${volumeLabel(units)}/yr)`,
      before: displayVolumeFt3(s.baseline.shipped_ft3, units),
      after: displayVolumeFt3(s.optimized.shipped_ft3, units),
      fmt: compact,
    },
  ];
  return (
    <Card data-testid="before-after-chart">
      <CardHeader>
        <CardTitle className="text-base">Before vs. after</CardTitle>
        <CardDescription>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: CHART.before }}
            />
            Before: your current boxes
          </span>{" "}
          <span className="ml-3 inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: CHART.after }}
            />
            After: recommended set
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {panels.map((p) => (
            <MiniBars key={p.title} panel={p} />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Compared on {Math.round(s.baseline.orders).toLocaleString()} orders per year that both box
          sets can ship. Total before: {usd(s.baseline.total_usd)}; after:{" "}
          {usd(s.optimized.total_usd)}.
        </p>
      </CardContent>
    </Card>
  );
}
