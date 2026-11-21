"use client";

import { Button } from "@/components/ui/button";
import { useWorkbench } from "./state";

export function SettingsStep() {
  const wb = useWorkbench();
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => wb.setStep("map")}>
          Back
        </Button>
        <Button onClick={() => void wb.run()} disabled={wb.running} data-testid="run-optimizer">
          Find my best boxes
        </Button>
      </div>
    </div>
  );
}
