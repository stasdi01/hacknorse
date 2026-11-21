import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, Lock, Package, Scale, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/config/app";

/**
 * Facts for the landing page. PLACEHOLDERS: the team fills in verified
 * numbers and sources before presenting (PRD §15).
 */
const FACTS = [
  {
    icon: Package,
    value: "[X]%",
    text: "of the average e-commerce parcel is empty space.",
    source: "Source: [to be added by the team]",
  },
  {
    icon: Scale,
    value: "DIM",
    text: "Carriers bill by box size, not only weight. Oversized boxes cost more to ship.",
    source: "Source: [carrier DIM weight rules, to be added]",
  },
  {
    icon: Boxes,
    value: "[X] bn",
    text: "boxes are shipped every year; every unnecessary inch is cardboard and truck space.",
    source: "Source: [to be added by the team]",
  },
];

const STEPS = [
  {
    icon: Upload,
    title: "Add your order history",
    text: "Upload products and orders as CSV. Columns from Shopify, Etsy or WooCommerce exports are matched automatically.",
  },
  {
    icon: BarChart3,
    title: "We design your box set",
    text: "We test thousands of box combinations against every order and choose the K sizes with the lowest shipping + box cost.",
  },
  {
    icon: Package,
    title: "Buy the right boxes",
    text: "See the before/after, every order packed in 3D, and download a buying list and packing guide.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="border-b border-border bg-gradient-to-b from-kraft-light to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-kraft/30 bg-card px-3 py-1 text-sm text-kraft-dark">
              <Package className="size-4" aria-hidden /> {APP_NAME} · {APP_TAGLINE}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              You&apos;re paying to <span className="text-kraft-dark">ship air.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              {APP_NAME} designs the best set of shipping box sizes for your store, from your own
              order history. Less empty space, less cardboard, lower shipping bills.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/app?sample=1" data-testid="try-sample">
                  Try with a sample store <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link href="/app">Use my data</Link>
              </Button>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4 text-leaf" aria-hidden />
              Runs entirely in your browser. Your order data never leaves your computer.
            </p>
          </div>
          <HeroIllustration />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {FACTS.map((f) => (
            <div key={f.text} className="space-y-3 rounded-xl border border-border bg-card p-6">
              <f.icon className="size-6 text-kraft" aria-hidden />
              <p className="text-3xl font-semibold tracking-tight">{f.value}</p>
              <p>{f.text}</p>
              <p className="text-xs text-muted-foreground">{f.source}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl space-y-10 px-4 py-16 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight">
              Box pickers choose a box. We design the set.
            </h2>
            <p className="text-muted-foreground">
              Packing apps pick the best box from the boxes you already own. {APP_NAME} tells you
              which box sizes to own in the first place, and our &quot;before&quot; already gives
              every order its best current box, so the savings come on top.
            </p>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-leaf-light font-semibold text-leaf">
                    {i + 1}
                  </span>
                  <s.icon className="size-5 text-kraft" aria-hidden />
                </div>
                <h3 className="text-lg font-medium">{s.title}</h3>
                <p className="text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/app?sample=1">
                See it on a sample store <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/method">How the method works</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        {APP_NAME} · built for HackNorse 2026 (Sustainability track). The sample store is synthetic.
      </footer>
    </main>
  );
}

/** A big box with a little item vs. a snug box: the whole idea in one picture. */
function HeroIllustration() {
  return (
    <figure
      className="mx-auto w-full max-w-md"
      aria-label="A small item in an oversized box next to the same item in a snug box"
    >
      <svg viewBox="0 0 420 260" className="w-full" role="img">
        <title>Oversized box versus right-sized box</title>
        {/* Oversized box */}
        <g>
          <polygon
            points="30,90 150,60 230,90 110,120"
            fill="#e8d7b9"
            stroke="#7a5c2e"
            strokeWidth="2"
          />
          <polygon
            points="30,90 110,120 110,230 30,200"
            fill="#c9a56d"
            stroke="#7a5c2e"
            strokeWidth="2"
          />
          <polygon
            points="110,120 230,90 230,200 110,230"
            fill="#b08d57"
            stroke="#7a5c2e"
            strokeWidth="2"
          />
          <polygon points="112,160 142,152 160,160 130,168" fill="#2f7d4f" opacity="0.9" />
          <text x="130" y="252" textAnchor="middle" fontSize="13" fill="#6f665a">
            Before: mostly air
          </text>
        </g>
        {/* Snug box */}
        <g>
          <polygon
            points="290,150 330,140 360,150 320,160"
            fill="#e8d7b9"
            stroke="#7a5c2e"
            strokeWidth="2"
          />
          <polygon
            points="290,150 320,160 320,205 290,195"
            fill="#c9a56d"
            stroke="#7a5c2e"
            strokeWidth="2"
          />
          <polygon
            points="320,160 360,150 360,195 320,205"
            fill="#b08d57"
            stroke="#7a5c2e"
            strokeWidth="2"
          />
          <text x="325" y="252" textAnchor="middle" fontSize="13" fill="#2f7d4f">
            After: right-sized
          </text>
        </g>
        <path d="M245 150 h28" stroke="#6f665a" strokeWidth="2" markerEnd="url(#arrow)" />
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#6f665a" />
          </marker>
        </defs>
      </svg>
    </figure>
  );
}
