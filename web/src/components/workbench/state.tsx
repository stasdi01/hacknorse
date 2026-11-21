"use client";

/**
 * Workbench state: uploaded files, mappings, settings, units and the
 * latest report. Everything stays in the browser.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { optimize } from "@/engine/client";
import { DEFAULT_SETTINGS } from "@/engine/defaults";
import type { Report, Settings } from "@/engine/types";
import type { FileInput } from "@/lib/data/build";
import { buildDataset, prepareFile, withSettings, type DatasetResult } from "@/lib/data/dataset";
import type { ColumnMapping, FileKind } from "@/lib/data/mapping";
import { fetchSampleTexts, sampleFiles } from "@/lib/data/sample";
import type { LengthUnit, UnitSystem, WeightUnit } from "@/lib/data/units";

export type Step = "data" | "map" | "settings" | "results";

export interface UploadedFile {
  name: string;
  input: FileInput;
}

export type Files = Record<FileKind, UploadedFile | null>;

interface WorkbenchState {
  step: Step;
  files: Files;
  isSample: boolean;
  settings: Settings;
  units: UnitSystem;
  report: Report | null;
  running: boolean;
  stage: string;
  error: string | null;
}

interface WorkbenchApi extends WorkbenchState {
  dataset: DatasetResult;
  setStep: (step: Step) => void;
  setFileText: (kind: FileKind, name: string, text: string) => void;
  removeFile: (kind: FileKind) => void;
  setMapping: (kind: FileKind, mapping: ColumnMapping) => void;
  setUnits: (kind: FileKind, units: { lengthUnit?: LengthUnit; weightUnit?: WeightUnit }) => void;
  loadSample: () => Promise<void>;
  setSettings: (s: Settings) => void;
  setDisplayUnits: (u: UnitSystem) => void;
  run: (settings?: Settings) => Promise<void>;
}

const EMPTY_FILES: Files = { products: null, orders: null, boxes: null };

const Ctx = createContext<WorkbenchApi | null>(null);

export function useWorkbench(): WorkbenchApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkbench must be used inside <WorkbenchProvider>");
  return v;
}

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkbenchState>({
    step: "data",
    files: EMPTY_FILES,
    isSample: false,
    settings: DEFAULT_SETTINGS,
    units: "imperial",
    report: null,
    running: false,
    stage: "",
    error: null,
  });
  const runId = useRef(0);

  const patch = useCallback((p: Partial<WorkbenchState>) => setState((s) => ({ ...s, ...p })), []);

  const dataset = useMemo(
    () =>
      buildDataset({
        products: state.files.products?.input ?? null,
        orders: state.files.orders?.input ?? null,
        boxes: state.files.boxes?.input ?? null,
      }),
    [state.files],
  );

  const updateFile = useCallback(
    (kind: FileKind, f: (u: UploadedFile) => UploadedFile) =>
      setState((s) => {
        const cur = s.files[kind];
        if (!cur) return s;
        return { ...s, files: { ...s.files, [kind]: f(cur) }, isSample: false, report: null };
      }),
    [],
  );

  const runWith = useCallback(
    async (files: Files, settings: Settings) => {
      const id = ++runId.current;
      const ds = buildDataset({
        products: files.products?.input ?? null,
        orders: files.orders?.input ?? null,
        boxes: files.boxes?.input ?? null,
      });
      if (!ds.input) {
        patch({ error: "The data is not ready: check the mapping and validation.", step: "map" });
        return;
      }
      patch({ running: true, stage: "Starting engine…", error: null });
      try {
        const report = await optimize(withSettings(ds.input, settings), (text) => {
          if (id === runId.current) patch({ stage: text });
        });
        if (id === runId.current) {
          patch({ report, running: false, stage: "", step: "results", settings });
        }
      } catch (e) {
        if (id === runId.current) {
          patch({ running: false, stage: "", error: e instanceof Error ? e.message : String(e) });
        }
      }
    },
    [patch],
  );

  const api: WorkbenchApi = {
    ...state,
    dataset,
    setStep: (step) => patch({ step, error: null }),
    setFileText: (kind, name, text) =>
      setState((s) => ({
        ...s,
        files: { ...s.files, [kind]: { name, input: prepareFile(kind, text) } },
        isSample: false,
        report: null,
        error: null,
      })),
    removeFile: (kind) =>
      setState((s) => ({
        ...s,
        files: { ...s.files, [kind]: null },
        isSample: false,
        report: null,
      })),
    setMapping: (kind, mapping) =>
      updateFile(kind, (u) => ({ ...u, input: { ...u.input, mapping } })),
    setUnits: (kind, units) => updateFile(kind, (u) => ({ ...u, input: { ...u.input, ...units } })),
    loadSample: async () => {
      patch({ running: true, stage: "Loading sample store…", error: null });
      try {
        const texts = await fetchSampleTexts();
        const f = sampleFiles(texts);
        const files: Files = {
          products: f.products && { name: "products.csv (sample)", input: f.products },
          orders: f.orders && { name: "orders.csv (sample)", input: f.orders },
          boxes: f.boxes && { name: "current_boxes.csv (sample)", input: f.boxes },
        };
        patch({ files, isSample: true });
        await runWith(files, state.settings);
      } catch (e) {
        patch({ running: false, stage: "", error: e instanceof Error ? e.message : String(e) });
      }
    },
    setSettings: (settings) => patch({ settings }),
    setDisplayUnits: (units) => patch({ units }),
    run: (settings) => runWith(state.files, settings ?? state.settings),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
