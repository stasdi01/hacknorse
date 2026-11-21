import Link from "next/link";
import { Package } from "lucide-react";
import { APP_NAME } from "@/config/app";

export function SiteHeader() {
  return (
    <header className="no-print border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-kraft-dark">
          <Package className="size-5 text-kraft" aria-hidden />
          <span>{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          <Link href="/app" className="rounded px-2 py-1 hover:bg-muted">
            Optimizer
          </Link>
          <Link href="/method" className="rounded px-2 py-1 hover:bg-muted">
            Method
          </Link>
        </nav>
      </div>
    </header>
  );
}
