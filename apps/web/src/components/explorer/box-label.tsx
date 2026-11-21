import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

export function BoxLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={classNames(
        "relative z-10 -mb-1 block w-fit rounded-md bg-surface px-2 py-0.5 text-[10px] text-muted uppercase tracking-[0.12em] [font-family:var(--font-space-grotesk)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
