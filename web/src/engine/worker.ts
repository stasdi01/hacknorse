/// <reference lib="webworker" />
/**
 * Engine Web Worker: loads the Rust/WASM engine and serves JSON requests.
 * The WASM module is only ever loaded here, never on the main thread.
 */
import init, * as engine from "@/engine-wasm/box_engine";
import type { EngineRequest, EngineResponse } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

let ready: Promise<unknown> | null = null;

function ensureReady(): Promise<unknown> {
  if (!ready) {
    ready = init();
  }
  return ready;
}

function post(msg: EngineResponse): void {
  self.postMessage(msg);
}

self.onmessage = async (event: MessageEvent<EngineRequest>) => {
  const { id, method, input } = event.data;
  try {
    post({ id, kind: "stage", text: "Loading engine…" });
    await ensureReady();
    let output: string;
    switch (method) {
      case "version":
        output = engine.version();
        break;
      default:
        throw new Error(`Unknown engine method: ${String(method)}`);
    }
    void input;
    post({ id, kind: "result", output });
  } catch (err) {
    post({ id, kind: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
