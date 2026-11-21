"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Report } from "@/engine/types";
import { downloadText } from "@/lib/download";
import { buyingListCsv, packingGuideCsv } from "@/lib/export";

export function ExportBar({
  report,
  names,
  onReport,
}: {
  report: Report;
  names: ReadonlyMap<string, string>;
  onReport: () => void;
}) {
  return (
    <Card className="no-print" data-testid="export-bar">
      <CardHeader>
        <CardTitle className="text-base">Export</CardTitle>
        <CardDescription>Files are created in your browser.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() =>
            downloadText(`buying-list-k${report.settings.k}.csv`, buyingListCsv(report))
          }
          data-testid="export-buying-list"
        >
          <FileDown aria-hidden /> Buying list (CSV)
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadText(`packing-guide-k${report.settings.k}.csv`, packingGuideCsv(report, names))
          }
          data-testid="export-packing-guide"
        >
          <FileDown aria-hidden /> Packing guide (CSV)
        </Button>
        <Button variant="outline" onClick={onReport} data-testid="open-report">
          <Printer aria-hidden /> Print report / Save as PDF
        </Button>
      </CardContent>
    </Card>
  );
}
