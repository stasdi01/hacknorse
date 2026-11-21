"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Issue } from "@/lib/data/build";
import { FIELD_DEFS, type FileKind } from "@/lib/data/mapping";
import { FILE_LABELS } from "@/lib/data/templates";
import type { LengthUnit, WeightUnit } from "@/lib/data/units";
import { useWorkbench } from "./state";

const NONE = "__none__";
const LENGTH_UNITS: LengthUnit[] = ["in", "cm", "mm"];
const WEIGHT_UNITS: WeightUnit[] = ["lb", "kg", "g", "oz"];

function MappingCard({ kind }: { kind: FileKind }) {
  const wb = useWorkbench();
  const file = wb.files[kind];
  if (!file) return null;
  const { csv, mapping, lengthUnit, weightUnit } = file.input;
  const preview = csv.rows.slice(0, 3);
  const hasWeight = FIELD_DEFS[kind].some((d) => d.field === "weight");
  const hasLength = FIELD_DEFS[kind].some((d) => d.field === "length");

  return (
    <Card data-testid={`mapping-${kind}`}>
      <CardHeader>
        <CardTitle className="text-base">{FILE_LABELS[kind].title}</CardTitle>
        <CardDescription>
          {file.name} · {csv.headers.length} columns · {csv.rows.length.toLocaleString()} rows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(hasLength || hasWeight) && (
          <div className="flex flex-wrap gap-4">
            {hasLength && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`${kind}-len-unit`}>Length unit</Label>
                <Select
                  value={lengthUnit}
                  onValueChange={(v) => wb.setUnits(kind, { lengthUnit: v as LengthUnit })}
                >
                  <SelectTrigger id={`${kind}-len-unit`} size="sm" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTH_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {hasWeight && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`${kind}-wt-unit`}>Weight unit</Label>
                <Select
                  value={weightUnit}
                  onValueChange={(v) => wb.setUnits(kind, { weightUnit: v as WeightUnit })}
                >
                  <SelectTrigger id={`${kind}-wt-unit`} size="sm" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Field</TableHead>
                <TableHead className="w-56">Your column</TableHead>
                <TableHead>Example values</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FIELD_DEFS[kind].map((def) => {
                const idx = mapping[def.field];
                const mapped = idx !== null && idx !== undefined;
                return (
                  <TableRow key={def.field}>
                    <TableCell className="font-medium">
                      {def.label}
                      {def.required ? (
                        <span className="text-destructive"> *</span>
                      ) : (
                        <span className="text-xs text-muted-foreground"> (optional)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapped ? String(idx) : NONE}
                        onValueChange={(v) =>
                          wb.setMapping(kind, {
                            ...mapping,
                            [def.field]: v === NONE ? null : Number(v),
                          })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-52"
                          aria-label={`Column for ${def.label}`}
                          data-testid={`map-${kind}-${def.field}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— not mapped —</SelectItem>
                          {csv.headers.map((h, i) => (
                            <SelectItem key={`${h}-${i}`} value={String(i)}>
                              {h || `(column ${i + 1})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {idx !== null && idx !== undefined
                        ? preview.map((r) => r[idx] ?? "").join(" · ")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const Icon = issue.severity === "error" ? XCircle : AlertTriangle;
  return (
    <li className="flex gap-2 text-sm">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${issue.severity === "error" ? "text-destructive" : "text-amber-600"}`}
        aria-hidden
      />
      <span>
        <span className="text-muted-foreground">
          {FILE_LABELS[issue.file].title}
          {issue.row !== null ? `, row ${issue.row}` : ""}:{" "}
        </span>
        {issue.message}
      </span>
    </li>
  );
}

const MAX_SHOWN = 40;

function ValidationReport() {
  const wb = useWorkbench();
  const { counts, issues, ready } = wb.dataset;
  const kinds: FileKind[] = ["products", "orders", "boxes"];
  const sorted = [...issues].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  );
  return (
    <Card data-testid="validation-report">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {ready ? (
            <CheckCircle2 className="size-5 text-leaf" aria-hidden />
          ) : (
            <XCircle className="size-5 text-destructive" aria-hidden />
          )}
          Validation
        </CardTitle>
        <CardDescription>
          {ready
            ? "Ready. Rows with problems are skipped; you can continue."
            : "Products and orders need all required columns mapped and at least one valid row."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {kinds
            .filter((k) => wb.files[k])
            .map((k) => (
              <Badge key={k} variant="secondary" data-testid={`count-${k}`}>
                {FILE_LABELS[k].title}: {counts[k].valid.toLocaleString()} valid
                {counts[k].skipped > 0 ? `, ${counts[k].skipped.toLocaleString()} skipped` : ""}
              </Badge>
            ))}
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No problems found.</p>
        ) : (
          <ul className="max-h-72 space-y-1.5 overflow-auto" data-testid="issues">
            {sorted.slice(0, MAX_SHOWN).map((iss, i) => (
              <IssueRow key={i} issue={iss} />
            ))}
            {sorted.length > MAX_SHOWN && (
              <li className="text-sm text-muted-foreground">
                … and {sorted.length - MAX_SHOWN} more
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function MappingStep() {
  const wb = useWorkbench();
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        We matched your columns automatically. Check each field and correct it if needed.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        <MappingCard kind="products" />
        <MappingCard kind="orders" />
        <MappingCard kind="boxes" />
      </div>
      <ValidationReport />
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => wb.setStep("data")}>
          Back
        </Button>
        <Button
          onClick={() => wb.setStep("settings")}
          disabled={!wb.dataset.ready}
          data-testid="to-settings"
        >
          Continue to settings
        </Button>
      </div>
    </div>
  );
}
