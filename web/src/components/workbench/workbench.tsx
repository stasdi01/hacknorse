"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataStep } from "./data-step";
import { MappingStep } from "./mapping-step";
import { ResultsStep } from "./results-step";
import { SettingsStep } from "./settings-step";
import { useWorkbench, WorkbenchProvider, type Step } from "./state";

const STEPS: { id: Step; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "map", label: "Map & validate" },
  { id: "settings", label: "Settings" },
  { id: "results", label: "Results" },
];

function Stepper() {
  const wb = useWorkbench();
  const current = STEPS.findIndex((s) => s.id === wb.step);
  const enabled = (id: Step) => {
    if (id === "data") return true;
    if (id === "map") return !!wb.files.products && !!wb.files.orders;
    if (id === "settings") return wb.dataset.ready;
    return !!wb.report;
  };
  return (
    <ol className="no-print flex flex-wrap items-center gap-2 text-sm" aria-label="Steps">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <button
            type="button"
            disabled={!enabled(s.id) || wb.running}
            onClick={() => wb.setStep(s.id)}
            aria-current={i === current ? "step" : undefined}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors disabled:opacity-40 ${
              i === current
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-secondary"
            }`}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-background/20 text-xs font-semibold">
              {i + 1}
            </span>
            {s.label}
          </button>
          {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function AutoSample() {
  const wb = useWorkbench();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    if (new URLSearchParams(window.location.search).get("sample") === "1") {
      started.current = true;
      void wb.loadSample();
    }
  }, [wb]);
  return null;
}

function Body() {
  const wb = useWorkbench();
  return (
    <div className="space-y-6">
      <Stepper />
      {wb.error && (
        <Alert variant="destructive" className="no-print">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{wb.error}</AlertDescription>
        </Alert>
      )}
      {wb.running && (
        <div
          className="no-print flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          role="status"
          data-testid="engine-stage"
        >
          <Loader2 className="size-5 animate-spin text-kraft" aria-hidden />
          <span>{wb.stage || "Working…"}</span>
        </div>
      )}
      {wb.step === "data" && <DataStep />}
      {wb.step === "map" && <MappingStep />}
      {wb.step === "settings" && <SettingsStep />}
      {wb.step === "results" && wb.report && <ResultsStep />}
    </div>
  );
}

export function Workbench() {
  return (
    <WorkbenchProvider>
      <AutoSample />
      <Body />
    </WorkbenchProvider>
  );
}
