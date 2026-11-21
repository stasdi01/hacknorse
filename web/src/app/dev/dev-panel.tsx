"use client";

import { useEffect, useState } from "react";
import { engineVersion, optimize } from "@/engine/client";
import { DEFAULT_SETTINGS } from "@/engine/defaults";
import type { Report } from "@/engine/types";
import { withSettings } from "@/lib/data/dataset";
import { loadSampleDataset } from "@/lib/data/sample";

export function DevPanel() {
  const [version, setVersion] = useState<string>("loading…");
  const [stage, setStage] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    engineVersion()
      .then((v) => setVersion(v))
      .catch((e: unknown) => setVersion(`error: ${e instanceof Error ? e.message : String(e)}`));
  }, []);

  async function runSample() {
    setError("");
    setReport(null);
    try {
      setStage("Loading sample store…");
      const ds = await loadSampleDataset();
      if (!ds.input) throw new Error("Sample data is not usable");
      const r = await optimize(withSettings(ds.input, DEFAULT_SETTINGS), setStage);
      setReport(r);
      setStage("Done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("");
    }
  }

  // Keep the JSON view small: the full report has every signature.
  const preview = report && {
    ...report,
    assignments: `${report.assignments.length} assignments (hidden)`,
    placements: `${report.placements.length} placements (hidden)`,
    flagged: report.flagged.slice(0, 5),
  };

  return (
    <div className="space-y-4">
      <p>
        Engine version (from WASM in a Web Worker):{" "}
        <code data-testid="engine-version">{version}</code>
      </p>
      <button
        type="button"
        onClick={runSample}
        className="rounded bg-neutral-900 px-4 py-2 text-white"
        data-testid="run-sample"
      >
        Run optimize() on the sample store
      </button>
      {stage && <p data-testid="engine-stage">{stage}</p>}
      {error && <p className="text-red-600">{error}</p>}
      {preview && (
        <pre
          data-testid="engine-report"
          className="max-h-[70vh] overflow-auto rounded bg-neutral-100 p-4 text-xs"
        >
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  );
}
