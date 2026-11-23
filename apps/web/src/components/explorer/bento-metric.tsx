import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

import { MaskedIcon } from "./masked-icon";
import { Skeleton } from "./skeleton";

type IconComponent = React.ComponentType<{ className?: string }>;

export function BentoMetric({
  className,
  hint,
  icon,
  iconClassName,
  label,
  loading = false,
  value,
  valueWidth = "5ch",
  valueClassName,
}: {
  className?: string;
  hint?: ReactNode;
  icon: IconComponent;
  iconClassName?: string;
  label: string;
  loading?: boolean;
  value: ReactNode;
  valueWidth?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={classNames(
        "corner-frame corner-frame-card flex flex-col rounded-[6px] p-1.5",
        className,
      )}
    >
      <div className="relative flex-1 overflow-hidden rounded-[4px] bg-surface p-4 sm:p-5">
        <MaskedIcon
          className={classNames(
            "pointer-events-none absolute -right-4 -bottom-4 size-28 text-foreground",
            iconClassName,
          )}
          icon={icon}
        />
        {loading ? (
          <div className="flex h-full flex-col justify-between gap-8">
            <Skeleton className="text-[10px]" height="1em" width="40%" />
            <Skeleton
              className={classNames(
                "my-1",
                valueClassName ?? "text-2xl sm:text-5xl min-[380px]:text-3xl",
              )}
              height="1em"
              width={valueWidth}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between gap-8">
            <span className="font-mono font-medium text-[11px] text-muted uppercase tracking-[0.14em]">
              {label}
            </span>
            <div className="min-w-0">
              <div
                className={classNames(
                  "font-semibold tabular-nums tracking-tight",
                  valueClassName ?? "text-2xl sm:text-5xl min-[380px]:text-3xl",
                )}
              >
                {value}
              </div>
              {hint ? <div className="mt-1.5 truncate text-muted text-xs">{hint}</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
