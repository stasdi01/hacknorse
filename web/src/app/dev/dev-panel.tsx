"use client";

import { useEffect, useState } from "react";
import { engineVersion } from "@/engine/client";

export function DevPanel() {
  const [version, setVersion] = useState<string>("loading…");

  useEffect(() => {
    engineVersion()
      .then((v) => setVersion(v))
      .catch((e: unknown) => setVersion(`error: ${e instanceof Error ? e.message : String(e)}`));
  }, []);

  return (
    <p>
      Engine version (from WASM in a Web Worker):{" "}
      <code data-testid="engine-version">{version}</code>
    </p>
  );
}
