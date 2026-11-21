import type { Metadata } from "next";
import { Workbench } from "@/components/workbench/workbench";

export const metadata: Metadata = { title: "Optimizer" };

export default function AppPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <Workbench />
    </main>
  );
}
