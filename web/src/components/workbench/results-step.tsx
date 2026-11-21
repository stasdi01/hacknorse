"use client";

import { useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BeforeAfterChart } from "@/components/results/before-after-chart";
import { CurrentBoxes, RecommendedBoxes } from "@/components/results/box-tables";
import { ExportBar } from "@/components/results/export-bar";
import { PrintReport } from "@/components/results/print-report";
import { FlaggedPanel } from "@/components/results/flagged-panel";
import { KCurve } from "@/components/results/k-curve";
import { KpiCards } from "@/components/results/kpi-cards";
import { productNames } from "@/components/results/labels";
import { OrdersTable } from "@/components/results/orders-table";
import { Viewer3D } from "@/components/results/viewer-3d";
import { SAMPLE_STORE_NAME } from "@/lib/data/sample";
import { num } from "@/lib/format";
import { KSlider, UnitsToggle } from "./settings-step";
import { useWorkbench } from "./state";

export function ResultsStep() {
  const wb = useWorkbench();
  const r = wb.report;
  const [k, setK] = useState(wb.settings.k);
  const [viewed, setViewed] = useState(0);
  const names = useMemo(() => productNames(wb.dataset.input?.products), [wb.dataset.input]);
  const viewable = useMemo(() => new Set((r?.placements ?? []).map((p) => p.signature_id)), [r]);
  if (!r) return null;

  const rerun = (newK: number) => {
    if (newK !== r.settings.k) void wb.run({ ...wb.settings, k: newK });
  };
  const period = r.annualization.assumed_one_year
    ? "No order dates found: the dataset is treated as one year."
    : `Order dates span ${num(r.annualization.period_days ?? 0)} days; totals are scaled to one year.`;

  return (
    <div className="space-y-6" data-testid="results">
      <Card className="no-print">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">Your best {r.settings.k} box sizes</h1>
              {wb.isSample && <Badge variant="secondary">{SAMPLE_STORE_NAME}</Badge>}
              <Badge variant="outline">
                {r.settings.mode === "custom" ? "Custom sizes" : "Stock catalog"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {r.stats.orders_used.toLocaleString()} orders · {r.stats.signatures.toLocaleString()}{" "}
              distinct order types · {r.stats.candidates} candidate boxes · {period}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <KSlider value={k} onChange={setK} onCommit={rerun} />
            <UnitsToggle value={wb.units} onChange={wb.setDisplayUnits} />
            <Button variant="outline" onClick={() => wb.setStep("settings")}>
              <Settings2 aria-hidden /> Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <KpiCards report={r} units={wb.units} />

      <div className="grid gap-6 xl:grid-cols-2">
        <BeforeAfterChart report={r} units={wb.units} />
        <KCurve
          curve={r.curve}
          chosenK={r.settings.k}
          onPick={(newK) => {
            setK(newK);
            rerun(newK);
          }}
        />
      </div>

      <RecommendedBoxes
        boxes={r.recommended}
        units={wb.units}
        custom={r.settings.mode === "custom"}
      />
      <CurrentBoxes boxes={r.current} units={wb.units} />
      <Viewer3D
        placements={r.placements}
        assignments={r.assignments}
        names={names}
        units={wb.units}
        selected={viewed}
        onSelect={setViewed}
      />
      <OrdersTable
        assignments={r.assignments}
        names={names}
        viewable={viewable}
        onView={(id) => {
          setViewed(id);
          document
            .getElementById("viewer-3d")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        factor={r.annualization.factor}
      />
      <FlaggedPanel flagged={r.flagged} names={names} />
      <ExportBar report={r} names={names} onReport={() => wb.setStep("report")} />
      <p className="text-xs text-muted-foreground">
        Computed in your browser in {Math.round(r.timings_ms.total_ms)} ms (engine{" "}
        {r.engine_version}). Shipping rates are illustrative; replace them with your own in
        Settings.
      </p>
    </div>
  );
}

export function ReportStep() {
  const wb = useWorkbench();
  const names = useMemo(() => productNames(wb.dataset.input?.products), [wb.dataset.input]);
  if (!wb.report) return null;
  return (
    <PrintReport
      report={wb.report}
      names={names}
      units={wb.units}
      storeLabel={wb.isSample ? SAMPLE_STORE_NAME : null}
      onBack={() => wb.setStep("results")}
    />
  );
}
