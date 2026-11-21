"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Assignment, BoxMetrics } from "@/engine/types";
import { pct, usd } from "@/lib/format";
import { signatureLabel } from "./labels";

const PAGE = 15;

function BoxCell({ m }: { m: BoxMetrics | null }) {
  if (!m) return <span className="text-destructive">fits none</span>;
  return <span>{m.box_id}</span>;
}

function EmptyCell({ before, after }: { before: BoxMetrics | null; after: BoxMetrics | null }) {
  const f = (m: BoxMetrics | null) => (m ? pct(m.empty_space_pct) : "—");
  return (
    <span className="tabular-nums">
      {f(before)} <span className="text-muted-foreground">→</span>{" "}
      <span
        className={
          after && before && after.empty_space_pct < before.empty_space_pct ? "text-leaf" : ""
        }
      >
        {f(after)}
      </span>
    </span>
  );
}

interface Props {
  assignments: Assignment[];
  names: ReadonlyMap<string, string>;
  /** Signature ids that have 3D placements. */
  viewable: ReadonlySet<number>;
  onView?: (signatureId: number) => void;
  factor: number;
}

export function OrdersTable({ assignments, names, viewable, onView, factor }: Props) {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(
      (a) =>
        signatureLabel(a.items, names).toLowerCase().includes(q) ||
        a.items.some((i) => i.sku.toLowerCase().includes(q)),
    );
  }, [assignments, names, query]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <Card data-testid="orders-table">
      <CardHeader>
        <CardTitle className="text-base">Orders and their boxes</CardTitle>
        <CardDescription>
          Identical orders are grouped. {assignments.length.toLocaleString()} distinct order types,
          most frequent first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Filter by product or SKU…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
          aria-label="Filter orders"
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order contents</TableHead>
                <TableHead className="text-right">Orders / yr</TableHead>
                <TableHead>Current box</TableHead>
                <TableHead>Recommended box</TableHead>
                <TableHead>Empty space</TableHead>
                <TableHead className="text-right">Cost per order</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">3D</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((a) => (
                <TableRow key={a.signature_id}>
                  <TableCell className="max-w-80 truncate" title={signatureLabel(a.items, names)}>
                    {signatureLabel(a.items, names)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Math.round(a.count * factor).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <BoxCell m={a.baseline} />
                  </TableCell>
                  <TableCell>
                    <BoxCell m={a.optimized} />
                  </TableCell>
                  <TableCell>
                    <EmptyCell before={a.baseline} after={a.optimized} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.baseline ? usd(a.baseline.total_usd, 2) : "—"} →{" "}
                    {a.optimized ? usd(a.optimized.total_usd, 2) : "—"}
                  </TableCell>
                  <TableCell>
                    {viewable.has(a.signature_id) && onView && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="View in 3D"
                        onClick={() => onView(a.signature_id)}
                      >
                        <Eye />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {rows.length === 0
              ? "No matches"
              : `${current * PAGE + 1}–${Math.min(rows.length, (current + 1) * PAGE)} of ${rows.length.toLocaleString()}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="tabular-nums">
              {current + 1} / {pages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
