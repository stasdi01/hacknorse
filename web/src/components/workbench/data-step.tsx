"use client";

import { useRef } from "react";
import { Download, FileCheck2, Store, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadText } from "@/lib/download";
import type { FileKind } from "@/lib/data/mapping";
import { FILE_LABELS, TEMPLATES } from "@/lib/data/templates";
import { useWorkbench } from "./state";

const KINDS: FileKind[] = ["products", "orders", "boxes"];

function FileSlot({ kind }: { kind: FileKind }) {
  const wb = useWorkbench();
  const inputRef = useRef<HTMLInputElement>(null);
  const label = FILE_LABELS[kind];
  const file = wb.files[kind];

  async function onFiles(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    const text = await f.text();
    wb.setFileText(kind, f.name, text);
  }

  return (
    <Card data-testid={`file-slot-${kind}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {label.title}
          <span className="text-xs font-normal text-muted-foreground">
            {label.required ? "required" : "optional"}
          </span>
        </CardTitle>
        <CardDescription>{label.hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/40 p-4 text-center text-sm"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFiles(e.dataTransfer.files);
          }}
        >
          {file ? (
            <div className="flex w-full items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <FileCheck2 className="size-4 shrink-0 text-leaf" aria-hidden />
                <span className="truncate font-medium">{file.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {file.input.csv.rows.length.toLocaleString()} rows
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${label.title}`}
                onClick={() => wb.removeFile(kind)}
              >
                <X />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="size-5 text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">Drop a CSV here or</span>
              <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                Choose file
              </Button>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            data-testid={`file-input-${kind}`}
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0"
          onClick={() => downloadText(TEMPLATES[kind].filename, TEMPLATES[kind].text)}
        >
          <Download className="size-3.5" aria-hidden /> Download template
        </Button>
      </CardContent>
    </Card>
  );
}

export function DataStep() {
  const wb = useWorkbench();
  const canContinue = !!wb.files.products && !!wb.files.orders;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-kraft/30 bg-kraft-light p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">No data at hand?</h2>
          <p className="text-sm text-muted-foreground">
            Load “Fern &amp; Kiln”, a synthetic candle and ceramics store with 3,000 orders.
          </p>
        </div>
        <Button
          onClick={() => void wb.loadSample()}
          disabled={wb.running}
          data-testid="load-sample"
        >
          <Store aria-hidden /> Load sample store
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {KINDS.map((k) => (
          <FileSlot key={k} kind={k} />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Your files are read in this browser tab only. Nothing is uploaded to a server.
      </p>
      <div className="flex justify-end">
        <Button onClick={() => wb.setStep("map")} disabled={!canContinue} data-testid="to-mapping">
          Continue to column mapping
        </Button>
      </div>
    </div>
  );
}
