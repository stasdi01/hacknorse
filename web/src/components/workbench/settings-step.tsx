"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_SETTINGS,
  DIM_DIVISOR_UPS_FEDEX,
  DIM_DIVISOR_USPS,
  MAX_K,
  MAX_PADDING_IN,
  MIN_K,
  MIN_PADDING_IN,
} from "@/engine/defaults";
import type { CarrierPreset, Mode, RateTable, Settings } from "@/engine/types";
import { displayLength, lengthLabel, type UnitSystem } from "@/lib/data/units";
import { useWorkbench } from "./state";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function KSlider({
  value,
  onChange,
  onCommit,
}: {
  value: number;
  onChange: (k: number) => void;
  onCommit?: (k: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Slider
        min={MIN_K}
        max={MAX_K}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? value)}
        onValueCommit={(v) => onCommit?.(v[0] ?? value)}
        className="w-40 sm:w-48"
        aria-label="Number of box sizes"
        data-testid="k-slider"
      />
      <span className="w-20 text-sm tabular-nums">
        <span className="text-lg font-semibold">{value}</span> sizes
      </span>
    </div>
  );
}

export function UnitsToggle({
  value,
  onChange,
}: {
  value: UnitSystem;
  onChange: (u: UnitSystem) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-sm"
      role="group"
      aria-label="Units"
    >
      {(["imperial", "metric"] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          aria-pressed={value === u}
          data-testid={`units-${u}`}
          className={`rounded-md px-3 py-1 ${value === u ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
        >
          {u === "imperial" ? "in / lb" : "cm / kg"}
        </button>
      ))}
    </div>
  );
}

function RateInput({
  id,
  label,
  value,
  onChange,
  prefix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <Input
          id={id}
          type="number"
          min={0}
          step="0.05"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="w-24"
        />
      </div>
    </div>
  );
}

export function SettingsForm({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  const wb = useWorkbench();
  const set = <K extends keyof Settings>(key: K, v: Settings[K]) =>
    onChange({ ...settings, [key]: v });
  const setRate = (key: keyof RateTable, v: number) =>
    onChange({ ...settings, rate_table: { ...settings.rate_table, [key]: v } });
  const pad = displayLength(settings.padding_in, wb.units);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boxes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Box sizes to choose from">
            <RadioGroup
              value={settings.mode}
              onValueChange={(v) => set("mode", v as Mode)}
              className="grid gap-2"
            >
              <label className="flex items-start gap-2 text-sm">
                <RadioGroupItem value="stock" id="mode-stock" data-testid="mode-stock" />
                <span>
                  <span className="font-medium">Stock catalog</span>
                  <span className="block text-xs text-muted-foreground">
                    170 standard corrugated sizes you can buy off the shelf.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <RadioGroupItem value="custom" id="mode-custom" data-testid="mode-custom" />
                <span>
                  <span className="font-medium">Custom sizes (advanced)</span>
                  <span className="block text-xs text-muted-foreground">
                    Sizes designed around your orders. Custom sizes usually need a minimum order
                    quantity.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </Field>
          <Field label="Number of box sizes (K)" hint="The results also show every K from 1 to 8.">
            <KSlider value={settings.k} onChange={(k) => set("k", k)} />
          </Field>
          <Field
            label={`Padding per side: ${pad.toFixed(wb.units === "metric" ? 1 : 2)} ${lengthLabel(wb.units)}`}
            hint="Clearance on every side for protective fill."
          >
            <Slider
              min={MIN_PADDING_IN}
              max={MAX_PADDING_IN}
              step={0.25}
              value={[settings.padding_in]}
              onValueChange={(v) => set("padding_in", v[0] ?? settings.padding_in)}
              className="max-w-xs"
              aria-label="Padding per side"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={settings.allow_current_boxes}
              onCheckedChange={(c) => set("allow_current_boxes", c === true)}
            />
            Allow keeping my current box sizes
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipping</CardTitle>
          <CardDescription>
            Rates are illustrative. Replace them with your own rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Carrier preset" hint="How dimensional (DIM) weight is computed.">
            <RadioGroup
              value={settings.carrier}
              onValueChange={(v) => set("carrier", v as CarrierPreset)}
              className="grid gap-2"
            >
              <label className="flex items-start gap-2 text-sm">
                <RadioGroupItem value="ups_fedex" />
                <span>
                  <span className="font-medium">UPS/FedEx-style</span>
                  <span className="block text-xs text-muted-foreground">
                    DIM weight = L × W × H / {DIM_DIVISOR_UPS_FEDEX}, always applied.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <RadioGroupItem value="usps" />
                <span>
                  <span className="font-medium">USPS-style</span>
                  <span className="block text-xs text-muted-foreground">
                    DIM weight = L × W × H / {DIM_DIVISOR_USPS}, only above 1 ft³.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </Field>
          <Field label="Rate table (illustrative)" hint="Price at 1 lb, plus a price per extra lb.">
            <div className="flex flex-wrap gap-4">
              <RateInput
                id="rate-base"
                label="At 1 lb"
                prefix="$"
                value={settings.rate_table.base_usd}
                onChange={(v) => setRate("base_usd", v)}
              />
              <RateInput
                id="rate-per-lb"
                label="Per extra lb"
                prefix="$"
                value={settings.rate_table.per_lb_usd}
                onChange={(v) => setRate("per_lb_usd", v)}
              />
              <RateInput
                id="rate-max"
                label="Table up to (lb)"
                value={settings.rate_table.max_lb}
                onChange={(v) => setRate("max_lb", v)}
              />
            </div>
          </Field>
          <Field
            label="Void fill cost (estimate)"
            hint="Air pillows or paper per cubic foot of empty space inside the padding. Part of the total cost we minimize."
          >
            <RateInput
              id="void-fill-cost"
              label="Per ft³ of void"
              prefix="$"
              value={settings.void_fill_usd_per_ft3}
              onChange={(v) => set("void_fill_usd_per_ft3", v)}
            />
          </Field>
          <Field label="Units display">
            <UnitsToggle value={wb.units} onChange={wb.setDisplayUnits} />
          </Field>
          <Button variant="link" className="h-auto px-0" onClick={() => onChange(DEFAULT_SETTINGS)}>
            Reset to defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function settingsValid(s: Settings): boolean {
  const r = s.rate_table;
  return (
    [r.base_usd, r.per_lb_usd].every((v) => Number.isFinite(v) && v >= 0) &&
    Number.isFinite(r.max_lb) &&
    r.max_lb >= 1 &&
    Number.isFinite(s.void_fill_usd_per_ft3) &&
    s.void_fill_usd_per_ft3 >= 0
  );
}

export function SettingsStep() {
  const wb = useWorkbench();
  const valid = settingsValid(wb.settings);
  return (
    <div className="space-y-6">
      <SettingsForm settings={wb.settings} onChange={wb.setSettings} />
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => wb.setStep("map")}>
          Back
        </Button>
        <Button
          onClick={() => void wb.run()}
          disabled={wb.running || !valid}
          data-testid="run-optimizer"
        >
          Find my best boxes
        </Button>
      </div>
    </div>
  );
}
