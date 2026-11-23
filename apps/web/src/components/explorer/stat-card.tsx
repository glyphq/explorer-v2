import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

export function StatCard({
  className,
  hint,
  icon,
  label,
  value,
}: {
  className?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={classNames("corner-frame corner-frame-card rounded-[6px] p-1.5", className)}>
      <div className="flex h-full flex-col gap-3 rounded-[4px] bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium font-mono text-[11px] text-muted uppercase tracking-[0.14em]">
            {label}
          </p>
          {icon ? <span className="text-muted">{icon}</span> : null}
        </div>
        <div className="tabular font-semibold text-2xl text-foreground tracking-tight">{value}</div>
        {hint ? <div className="text-muted text-xs leading-5">{hint}</div> : null}
      </div>
    </div>
  );
}

export function KeyValue({
  label,
  mono,
  value,
}: {
  label: string;
  mono?: boolean;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <dt className="text-muted text-xs">{label}</dt>
      <dd
        className={classNames(
          "min-w-0 break-words text-foreground text-sm sm:text-right",
          mono ? "font-mono text-xs" : "",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
