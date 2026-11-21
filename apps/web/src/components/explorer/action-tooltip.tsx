import type { ReactNode } from "react";

export function ActionTooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className="pointer-events-none absolute top-full right-0 z-50 mt-1.5 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 font-medium text-background text-xs opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}
