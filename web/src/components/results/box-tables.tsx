"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BoxUsage } from "@/engine/types";
import { formatDims, type UnitSystem } from "@/lib/data/units";
import { num, pct, usd } from "@/lib/format";

function UsageBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full rounded-full bg-leaf"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="tabular-nums">{pct(value)}</span>
    </div>
  );
}

function BoxTable({
  boxes,
  units,
  testId,
}: {
  boxes: BoxUsage[];
  units: UnitSystem;
  testId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table data-testid={testId}>
        <TableHeader>
          <TableRow>
            <TableHead>Box</TableHead>
            <TableHead>Inside dimensions</TableHead>
            <TableHead className="text-right">Unit cost</TableHead>
            <TableHead className="text-right">Orders / yr</TableHead>
            <TableHead>Share of orders</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boxes.map((b) => (
            <TableRow key={b.box_id}>
              <TableCell className="font-medium">
                {b.box_id}
                {b.source === "custom" && (
                  <Badge variant="secondary" className="ml-2">
                    custom
                  </Badge>
                )}
                {b.source === "current" && (
                  <Badge variant="outline" className="ml-2">
                    current
                  </Badge>
                )}
              </TableCell>
              <TableCell>{formatDims(b.length_in, b.width_in, b.height_in, units)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {usd(b.unit_cost_usd, 2)}
                {b.source !== "current" && <span className="text-muted-foreground"> est.</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{num(b.orders)}</TableCell>
              <TableCell>
                <UsageBar value={b.orders_pct} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function RecommendedBoxes({
  boxes,
  units,
  custom,
}: {
  boxes: BoxUsage[];
  units: UnitSystem;
  custom: boolean;
}) {
  return (
    <Card data-testid="recommended-boxes">
      <CardHeader>
        <CardTitle className="text-base">Recommended box sizes</CardTitle>
        <CardDescription>
          Unit costs are estimates from box surface area.
          {custom && " Custom sizes usually need a minimum order quantity."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BoxTable boxes={boxes} units={units} testId="recommended-table" />
      </CardContent>
    </Card>
  );
}

export function CurrentBoxes({ boxes, units }: { boxes: BoxUsage[]; units: UnitSystem }) {
  if (boxes.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your current boxes (before)</CardTitle>
        <CardDescription>
          Each order in the cheapest current box it fits, like a box-picker app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BoxTable boxes={boxes} units={units} testId="current-table" />
      </CardContent>
    </Card>
  );
}
