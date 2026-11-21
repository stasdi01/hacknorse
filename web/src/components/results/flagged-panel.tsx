"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlagReason, Flagged } from "@/engine/types";
import { signatureLabel } from "./labels";

const REASONS: Record<FlagReason, { title: string; text: string }> = {
  fits_no_current_box: {
    title: "Fit none of your current boxes",
    text: "These orders are left out of the before/after comparison. The recommended set ships them.",
  },
  fits_no_candidate: {
    title: "Need 2+ boxes",
    text: "No single candidate box fits these orders. They are excluded from the optimization.",
  },
  too_many_items: {
    title: "Too large for this version (> 40 items)",
    text: "Very large orders are excluded and counted here.",
  },
};

export function FlaggedPanel({
  flagged,
  names,
}: {
  flagged: Flagged[];
  names: ReadonlyMap<string, string>;
}) {
  const groups = (Object.keys(REASONS) as FlagReason[])
    .map((reason) => ({ reason, items: flagged.filter((f) => f.reason === reason) }))
    .filter((g) => g.items.length > 0);

  return (
    <Card data-testid="flagged-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-amber-600" aria-hidden /> Flagged orders
        </CardTitle>
        <CardDescription>
          {groups.length === 0
            ? "Every order fits a box. Nothing to flag."
            : "Orders that could not be packed in one box."}
        </CardDescription>
      </CardHeader>
      {groups.length > 0 && (
        <CardContent className="space-y-5">
          {groups.map((g) => {
            const total = g.items.reduce((s, f) => s + f.count, 0);
            return (
              <section key={g.reason} className="space-y-2">
                <h3 className="text-sm font-medium">
                  {REASONS[g.reason].title}{" "}
                  <span className="text-muted-foreground">
                    · {total.toLocaleString()} order{total === 1 ? "" : "s"}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">{REASONS[g.reason].text}</p>
                <ul className="max-h-48 space-y-1 overflow-auto text-sm">
                  {g.items.slice(0, 50).map((f, i) => (
                    <li
                      key={`${f.signature_id ?? "x"}-${i}`}
                      className="flex justify-between gap-4"
                    >
                      <span className="truncate">{signatureLabel(f.items, names)}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {f.count}× · e.g. #{f.order_ids.slice(0, 2).join(", #")}
                      </span>
                    </li>
                  ))}
                  {g.items.length > 50 && (
                    <li className="text-muted-foreground">… and {g.items.length - 50} more</li>
                  )}
                </ul>
              </section>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
