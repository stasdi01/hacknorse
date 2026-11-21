/**
 * Main-thread client for the engine Web Worker. All engine calls go through
 * here; the WASM module never runs on the main thread.
 */
import type { EngineMethod, EngineRequest, EngineResponse } from "./protocol";

type StageListener = (text: string) => void;

interface Pending {
  resolve: (output: string) => void;
  reject: (err: Error) => void;
  onStage?: StageListener;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (typeof window === "undefined") {
    throw new Error("The engine can only run in the browser.");
  }
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<EngineResponse>) => {
      const msg = event.data;
      const p = pending.get(msg.id);
      if (!p) return;
      if (msg.kind === "stage") {
        p.onStage?.(msg.text);
      } else if (msg.kind === "result") {
        pending.delete(msg.id);
        p.resolve(msg.output);
      } else {
        pending.delete(msg.id);
        p.reject(new Error(msg.message));
      }
    };
    worker.onerror = (event: ErrorEvent) => {
      const err = new Error(event.message || "Engine worker failed");
      for (const p of pending.values()) p.reject(err);
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

/** Send a raw JSON request to the worker. */
export function callEngine(
  method: EngineMethod,
  input = "",
  onStage?: StageListener,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, onStage });
    const req: EngineRequest = { id, method, input };
    getWorker().postMessage(req);
  });
}

/** Engine version string. */
export function engineVersion(): Promise<string> {
  return callEngine("version");
}
