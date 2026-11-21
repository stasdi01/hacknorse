import type { Metadata } from "next";
import { DevPanel } from "./dev-panel";

export const metadata: Metadata = { title: "Engine dev page" };

export default function DevPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-semibold">Engine dev page</h1>
      <DevPanel />
    </main>
  );
}
