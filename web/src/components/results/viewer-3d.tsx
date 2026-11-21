"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Assignment, BoxMetrics, PackedBox, SignaturePlacements } from "@/engine/types";
import { formatDims, type UnitSystem } from "@/lib/data/units";
import { pct, usd } from "@/lib/format";
import { signatureLabel } from "./labels";

const BoxScene = dynamic(() => import("./box-scene").then((m) => m.BoxScene), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-lg bg-muted" />,
});

/** Categorical item colors in fixed order (dataviz reference palette). */
const ITEM_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
  "#e34948",
];
const OTHER_COLOR = "#9a9a94";

function Side({
  title,
  box,
  metrics,
  colors,
  sceneSize,
  units,
  testId,
}: {
  title: string;
  box: PackedBox | null;
  metrics: BoxMetrics | null;
  colors: ReadonlyMap<string, string>;
  sceneSize: number;
  units: UnitSystem;
  testId: string;
}) {
  return (
    <figure className="min-w-0 space-y-2" data-testid={testId}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-medium">{title}</span>
        {box && metrics ? (
          <span className="text-muted-foreground">
            {box.box_id} · {formatDims(box.length_in, box.width_in, box.height_in, units)} ·{" "}
            {pct(metrics.empty_space_pct)} empty · {usd(metrics.total_usd, 2)}/order
          </span>
        ) : (
          <span className="text-destructive">Fits none of these boxes</span>
        )}
      </figcaption>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-background">
        {box && <BoxScene box={box} colors={colors} sceneSize={sceneSize} />}
      </div>
    </figure>
  );
}

interface Props {
  placements: SignaturePlacements[];
  assignments: Assignment[];
  names: ReadonlyMap<string, string>;
  units: UnitSystem;
  selected: number;
  onSelect: (signatureId: number) => void;
}

export function Viewer3D({ placements, assignments, names, units, selected, onSelect }: Props) {
  const byId = new Map(assignments.map((a) => [a.signature_id, a]));
  const p = placements.find((x) => x.signature_id === selected) ?? placements[0];
  if (!p) return null;
  const a = byId.get(p.signature_id);
  const items = a?.items ?? [];
  const colors = new Map(items.map((it, i) => [it.sku, ITEM_COLORS[i] ?? OTHER_COLOR]));
  const dims = [p.baseline, p.optimized].flatMap((b) =>
    b ? [b.length_in, b.width_in, b.height_in] : [],
  );
  const sceneSize = Math.max(1, ...dims);

  return (
    <Card data-testid="viewer-3d" id="viewer-3d">
      <CardHeader>
        <CardTitle className="text-base">See it in 3D</CardTitle>
        <CardDescription>
          Pick one of the 50 most frequent orders. Drag to rotate, scroll to zoom. Both boxes are
          drawn at the same scale.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={String(p.signature_id)} onValueChange={(v) => onSelect(Number(v))}>
          <SelectTrigger
            className="w-full max-w-xl"
            aria-label="Order to view"
            data-testid="viewer-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {placements.map((x) => {
              const as = byId.get(x.signature_id);
              return (
                <SelectItem key={x.signature_id} value={String(x.signature_id)}>
                  #{x.signature_id + 1} · {as ? signatureLabel(as.items, names) : "order"} (
                  {as?.count ?? 0}×)
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <div className="grid gap-4 md:grid-cols-2">
          <Side
            title="Current box"
            box={p.baseline}
            metrics={a?.baseline ?? null}
            colors={colors}
            sceneSize={sceneSize}
            units={units}
            testId="viewer-before"
          />
          <Side
            title="Recommended box"
            box={p.optimized}
            metrics={a?.optimized ?? null}
            colors={colors}
            sceneSize={sceneSize}
            units={units}
            testId="viewer-after"
          />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Items">
          {items.map((it) => (
            <li key={it.sku} className="flex items-center gap-1.5">
              <span
                className="inline-block size-3 rounded-sm"
                style={{ background: colors.get(it.sku) }}
                aria-hidden
              />
              {it.quantity > 1 ? `${it.quantity} × ` : ""}
              {names.get(it.sku) ?? it.sku}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
