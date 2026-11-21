"use client";

import { CartesianGrid, Line, LineChart, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CurvePoint } from "@/engine/types";
import { CHART } from "@/lib/chart-colors";
import { compact, usd } from "@/lib/format";

interface Props {
  curve: CurvePoint[];
  chosenK: number;
  onPick?: (k: number) => void;
}

export function KCurve({ curve, chosenK, onPick }: Props) {
  const data = curve.map((p) => ({
    k: p.k,
    total: p.total_usd,
    boxes: p.box_ids.join(", "),
    unserved: p.orders_unserved,
  }));
  const chosen = data.find((d) => d.k === chosenK);
  return (
    <Card data-testid="k-curve">
      <CardHeader>
        <CardTitle className="text-base">Cost vs. number of box sizes</CardTitle>
        <CardDescription>
          Total shipping + box cost per year for each K. More sizes always cost less, but with
          diminishing returns. Click a point to choose K.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LineChart
          data={data}
          margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
          style={{ width: "100%", height: 260 }}
          responsive
          onClick={(state) => {
            const label = state?.activeLabel;
            if (label !== undefined && onPick) onPick(Number(label));
          }}
        >
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="k"
            tickLine={false}
            axisLine={{ stroke: CHART.grid }}
            tick={{ fill: CHART.axis, fontSize: 12 }}
            label={{
              value: "Number of box sizes (K)",
              position: "insideBottom",
              offset: -4,
              fill: CHART.axis,
              fontSize: 12,
            }}
            height={40}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.axis, fontSize: 12 }}
            tickFormatter={(v: number) => `$${compact(v)}`}
            width={56}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(v) => [usd(Number(v)), "Total per year"]}
            labelFormatter={(k) => `K = ${String(k)}`}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke={CHART.line}
            strokeWidth={2}
            dot={{ r: 4, fill: CHART.line, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
            style={{ cursor: onPick ? "pointer" : undefined }}
          />
          {chosen && (
            <ReferenceDot
              x={chosen.k}
              y={chosen.total}
              r={8}
              fill={CHART.after}
              stroke="#ffffff"
              strokeWidth={2}
              label={{
                value: `K = ${chosen.k}: ${usd(chosen.total)}`,
                position: "top",
                fill: "#2b2620",
                fontSize: 12,
                offset: 12,
              }}
            />
          )}
        </LineChart>
      </CardContent>
    </Card>
  );
}
