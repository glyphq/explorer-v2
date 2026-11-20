import Link from "next/link";
import type { Route } from "next";

import { GlyphMark } from "@/components/glyph-mark";

export default function NotFound() {
  return (
    <div className="page-width flex min-h-[70svh] flex-col items-center justify-center px-4 py-16 text-center lg:px-8">
      <GlyphMark className="size-10" />
      <p className="mt-6 font-mono text-[10px] text-muted uppercase tracking-[0.18em]">404</p>
      <h1 className="mt-2 font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-muted text-sm leading-6">
        That page does not exist. It may have moved, or the link may be incomplete.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          className="rounded-full bg-foreground px-4 py-2 font-medium text-background text-sm"
          href="/"
        >
          Open overview
        </Link>
        <Link
          className="rounded-full border border-foreground/15 px-4 py-2 font-medium text-foreground text-sm"
          href={"/transactions" as Route}
        >
          Browse transactions
        </Link>
      </div>
    </div>
  );
}
