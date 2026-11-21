/** Messages exchanged between the main thread and the engine Web Worker. */

export type EngineMethod = "version" | "optimize" | "validate";

export interface EngineRequest {
  id: number;
  method: EngineMethod;
  /** JSON input string (empty for `version`). */
  input: string;
}

export type EngineResponse =
  | { id: number; kind: "stage"; text: string }
  | { id: number; kind: "result"; output: string }
  | { id: number; kind: "error"; message: string };
