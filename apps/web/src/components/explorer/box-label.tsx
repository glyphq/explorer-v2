import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

export function BoxLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={classNames(
        "relative z-10 -mb-1 block w-fit rounded-[3px] bg-surface px-2 py-0.5 font-mono text-[10px] text-muted tracking-[0.04em]",
        className,
      )}
    >
      {children}
    </span>
  );
}
