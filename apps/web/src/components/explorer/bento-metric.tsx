import { AsciiReveal, AsciiSkeleton } from "ascii-reveal";
import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

import { MaskedIcon } from "./masked-icon";

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
        "relative h-full overflow-hidden rounded-xl bg-surface p-4 sm:p-5",
        className,
      )}
    >
      <MaskedIcon
        className={classNames(
          "pointer-events-none absolute -right-4 -bottom-4 size-28 text-foreground",
          iconClassName,
        )}
        icon={icon}
      />
      <AsciiReveal className="relative h-full" duration="fast" loading={loading} preset="decode">
        {loading ? (
          <div className="flex h-full flex-col justify-between gap-8">
            <AsciiSkeleton
              className="text-[10px] text-muted"
              lines={1}
              variant="dither"
              widths={["40%"]}
            />
            <AsciiSkeleton
              className={classNames("my-1", valueClassName ?? "text-4xl sm:text-5xl")}
              lines={1}
              variant="dither"
              widths={[valueWidth]}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between gap-8">
            <span className="font-medium text-[10px] text-muted uppercase tracking-[0.18em]">
              {label}
            </span>
            <div className="min-w-0">
              <div
                className={classNames(
                  "font-semibold tabular-nums tracking-tight",
                  valueClassName ?? "text-4xl sm:text-5xl",
                )}
              >
                {value}
              </div>
              {hint ? <div className="mt-1.5 truncate text-muted text-xs">{hint}</div> : null}
            </div>
          </div>
        )}
      </AsciiReveal>
    </div>
  );
}
