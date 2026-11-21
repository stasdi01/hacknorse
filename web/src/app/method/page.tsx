import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/app";
import * as D from "@/engine/defaults";
import { ValidationPanel } from "./validation-panel";

export const metadata: Metadata = { title: "Method" };

const PIPELINE = [
  { title: "Your CSVs", text: "Products, orders, current boxes" },
  { title: "Clean & group", text: "Identical orders become one order type with a count" },
  {
    title: "Candidate boxes",
    text: "170 standard stock sizes, or a tight custom size per order type",
  },
  { title: "Fit check", text: "3D packer: does this order fit this box?" },
  { title: "Cost", text: "DIM weight, billable weight, rate, box price" },
  { title: "Choose K boxes", text: "Greedy + swap search over all candidates" },
  { title: "Report", text: "Before/after, buying list, 3D view" },
];

const ASSUMPTIONS: { name: string; value: string; status: string }[] = [
  {
    name: "DIM divisor, UPS/FedEx-style",
    value: `${D.DIM_DIVISOR_UPS_FEDEX} in³/lb`,
    status: "Assumption: verify with carrier",
  },
  {
    name: "DIM divisor, USPS-style",
    value: `${D.DIM_DIVISOR_USPS} in³/lb, only above ${D.USPS_DIM_MIN_VOLUME_IN3} in³ (1 ft³)`,
    status: "Assumption: verify with carrier",
  },
  {
    name: "Billable weight",
    value: "max(actual, DIM), rounded up to whole lb",
    status: "Common carrier rule",
  },
  {
    name: "Rate table",
    value: `$${D.RATE_BASE_USD.toFixed(2)} at 1 lb + $${D.RATE_PER_LB_USD.toFixed(2)} per extra lb (to ${D.RATE_MAX_LB} lb, extended beyond)`,
    status: "Illustrative: replace with your rates",
  },
  {
    name: "Board weight (single wall)",
    value: `${D.BOARD_WEIGHT_LB_PER_FT2} lb/ft² (≈ 0.63 kg/m²)`,
    status: "Assumption: verify with supplier",
  },
  {
    name: "Stock box price",
    value: `$${D.STOCK_COST_BASE_USD.toFixed(2)} + $${D.STOCK_COST_PER_IN2_USD} × surface area (in²)`,
    status: "Estimate: compare with a price list",
  },
  {
    name: "Void fill cost",
    value: `$${D.VOID_FILL_USD_PER_FT3.toFixed(2)} per ft³ of void (usable volume − item volume); editable`,
    status: "Assumption: verify with your fill supplier",
  },
  {
    name: "Custom box price",
    value: `stock formula × ${D.CUSTOM_COST_MULTIPLIER}`,
    status: "Estimate; minimum order quantities apply",
  },
  {
    name: "Padding per side",
    value: `${D.DEFAULT_PADDING_IN} in (adjustable 0–2 in)`,
    status: "Default: adjust to your packing",
  },
  {
    name: "Order size cap",
    value: `${D.MAX_ITEMS_PER_ORDER} items per order`,
    status: "Larger orders are flagged",
  },
  {
    name: "Custom candidates",
    value: `up to ${D.MAX_CUSTOM_CANDIDATES} sizes, rounded up to ${D.CUSTOM_ROUND_STEP_IN} in`,
    status: "Engine limit",
  },
  {
    name: "Annualization",
    value: "365 / days spanned by order dates; no dates = one year",
    status: "Labeled in results",
  },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function MethodPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-14 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-sm text-kraft-dark">Method</p>
        <h1 className="text-4xl font-semibold tracking-tight">How {APP_NAME} chooses your boxes</h1>
        <p className="text-lg text-muted-foreground">
          A Rust engine, compiled to WebAssembly, runs in your browser. It tests every order against
          every candidate box and chooses the set of K sizes with the lowest total shipping + box
          cost.
        </p>
      </header>

      <Section id="pipeline" title="The pipeline">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="pipeline">
          {PIPELINE.map((p, i) => (
            <li key={p.title} className="relative rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-semibold text-kraft-dark">Step {i + 1}</span>
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="optimizer" title="Choosing K boxes, in plain words">
        <p>
          Think of each candidate box as a shop you could open, and each order type as a customer
          who goes to the cheapest open shop that fits them. Opening K shops so that the total cost
          for all customers is as small as possible is a classic problem called the{" "}
          <em>p-median</em> (or facility location) problem.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Cost of an order in a box</strong> = shipping price for its billable weight +
            the box price + void fill. Billable weight is the larger of the real weight (items +
            cardboard) and the DIM weight (box volume ÷ divisor), rounded up to a whole pound. Big
            boxes cost more even when they are light. Void fill is the material (air pillows, paper)
            needed for the space inside the padding that the products leave empty, priced at $
            {D.VOID_FILL_USD_PER_FT3.toFixed(2)} per ft³ by default.
          </li>
          <li>
            <strong>Greedy start:</strong> add the box that lowers the total cost the most, K times.
          </li>
          <li>
            <strong>Swap search:</strong> try replacing each chosen box with each other candidate
            and keep any swap that lowers the cost, until nothing improves (at most{" "}
            {D.LOCAL_SEARCH_MAX_ROUNDS} rounds). We also start from the best K−1 solution and from
            the best single boxes, so adding a box size never makes the result worse.
          </li>
          <li>
            Every order that fits some candidate must get a box: leaving it out costs a large
            penalty. Orders that fit no single box are listed as needing 2+ boxes.
          </li>
          <li>
            The <strong>baseline</strong> puts each order in the cheapest of your current boxes,
            which is what box-picker apps do. So the savings come on top of them.
          </li>
        </ul>
      </Section>

      <Section id="air" title="Why we measure air, not only empty space %">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Padding counts as empty space.</strong> Every box keeps {D.DEFAULT_PADDING_IN}{" "}
            in of clearance on each side for protection. That space holds no product, so it is part
            of the empty space, even for a perfect fit. A small candle in a snug box can still be
            more than half empty.
          </li>
          <li>
            <strong>Empty space % is relative.</strong> It is the same for a tiny box and a huge box
            with the same proportions, and it says nothing about how much is shipped. Small products
            make it look high even when there is little to gain.
          </li>
          <li>
            <strong>Air volume is absolute.</strong> Air shipped per year (box volume minus product
            volume, in ft³) is what fills trucks, what DIM pricing charges for, and what you buy
            void fill for. That is why the results lead with air shipped and void fill needed, and
            show empty space % as a secondary number.
          </li>
          <li>
            <strong>Void fill</strong> counts only the space inside the padding (usable volume minus
            product volume): the padding itself is the protective clearance.
          </li>
        </ul>
      </Section>

      <Section id="packer" title="Does it fit? The 3D packer">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Every box loses {D.DEFAULT_PADDING_IN} in of padding on each side (adjustable) for
            protective fill.
          </li>
          <li>
            <strong>One item:</strong> exact. It fits when its sorted dimensions are each no larger
            than the box&apos;s sorted inside dimensions (any rotation allowed).
          </li>
          <li>
            <strong>Several items:</strong> the extreme-point heuristic (Crainic, Perboli &amp;
            Tadei, 2008, simplified). Items go in largest first; each is placed at the lowest, then
            front-most, then left-most free corner point, trying all six rotations. A second pass
            orders items by longest side.
          </li>
          <li>
            It is <strong>conservative</strong>: it may say “no” for an order that could be squeezed
            in by hand, but every “yes” comes with a real, overlap-free placement (checked by
            property tests). This is the placement you see in the 3D viewer.
          </li>
        </ul>
      </Section>

      <Section id="validation" title="Validation against brute force">
        <p>
          On a reduced version of the sample store (the 25 most relevant candidate boxes), we try{" "}
          <em>every</em> combination of 2 and 3 boxes and compare the true optimum with our method.
        </p>
        <ValidationPanel />
      </Section>

      <Section id="assumptions" title="Assumptions">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="assumptions-table">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Constant</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">Source / status</th>
              </tr>
            </thead>
            <tbody>
              {ASSUMPTIONS.map((a) => (
                <tr key={a.name} className="border-t border-border">
                  <td className="px-3 py-2">{a.name}</td>
                  <td className="px-3 py-2">{a.value}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="privacy" title="Privacy">
        <p className="flex gap-3 rounded-lg border border-leaf/30 bg-leaf-light p-4">
          <Lock className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden />
          <span>
            Runs in your browser. Your CSV files are read and processed on your own computer inside
            a Web Worker; no order data is uploaded, stored or sent anywhere.
          </span>
        </p>
        <Button asChild>
          <Link href="/app">
            Try it on your data <ArrowRight aria-hidden />
          </Link>
        </Button>
      </Section>
    </main>
  );
}
