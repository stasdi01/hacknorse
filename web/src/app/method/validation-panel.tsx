"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { validate } from "@/engine/client";
import { DEFAULT_SETTINGS } from "@/engine/defaults";
import type { Mode, ValidationReport } from "@/engine/types";
import { withSettings } from "@/lib/data/dataset";
import { loadSampleDataset } from "@/lib/data/sample";
import { num, usd } from "@/lib/format";

export function ValidationPanel() {
  const [mode, setMode] = useState<Mode>("stock");
  const [result, setResult] = useState<ValidationReport | null>(null);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const started = useRef(false);

  async function run(m: Mode) {
    setMode(m);
    setError("");
    setResult(null);
    setStage("Loading sample store…");
    try {
      const ds = await loadSampleDataset();
      if (!ds.input) throw new Error("Sample data is not usable");
      const v = await validate(withSettings(ds.input, { ...DEFAULT_SETTINGS, mode: m }), setStage);
      setResult(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStage("");
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run("stock");
  }, []);

  return (
    <div className="space-y-4" data-testid="validation-panel">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={mode === "stock" ? "default" : "outline"}
          size="sm"
          onClick={() => void run("stock")}
          disabled={!!stage}
        >
          Stock catalog
        </Button>
        <Button
          variant={mode === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => void run("custom")}
          disabled={!!stage}
        >
          Custom sizes
        </Button>
      </div>
      {stage && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {stage}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <>
          <div className="overflow-x-auto">
            <Table data-testid="validation-table">
              <TableHeader>
                <TableRow>
                  <TableHead>K</TableHead>
                  <TableHead className="text-right">Combinations tried</TableHead>
                  <TableHead className="text-right">Optimal (brute force)</TableHead>
                  <TableHead className="text-right">Our method</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead className="text-right">Brute force time</TableHead>
                  <TableHead className="text-right">Our time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.cases.map((c) => (
                  <TableRow key={c.k}>
                    <TableCell>{c.k}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(c.combinations)}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(c.optimal_usd)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {usd(c.heuristic_usd)}
                    </TableCell>
                    <TableCell
                      className="text-right font-semibold tabular-nums"
                      data-testid={`gap-k${c.k}`}
                    >
                      {c.gap_pct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(c.brute_force_ms, 1)} ms
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(c.heuristic_ms, 1)} ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Sample store ({mode === "stock" ? "stock catalog" : "custom sizes"}), reduced to the{" "}
            {result.candidates_used} most relevant candidate boxes and {num(result.signatures)}{" "}
            order types; totals per year. Computed just now in your browser (engine{" "}
            {result.engine_version}).
          </p>
        </>
      )}
    </div>
  );
}
