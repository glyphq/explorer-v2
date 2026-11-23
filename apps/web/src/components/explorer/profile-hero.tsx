import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

export function ProfileHero({
  actions,
  avatar,
  children,
  className,
  meta,
  subtitle,
  title,
  value,
}: {
  actions?: ReactNode;
  avatar: ReactNode;
  children?: ReactNode;
  className?: string;
  meta?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
  value?: ReactNode;
}) {
  return (
    <section
      className={classNames(
        "corner-frame corner-frame-card relative overflow-hidden rounded-[4px] bg-surface p-5 sm:p-7",
        className,
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="shrink-0">{avatar}</span>
          <div className="min-w-0">
            <h1 className="font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
              {title}
            </h1>
            {subtitle ? <div className="mt-2 min-w-0 text-muted text-xs">{subtitle}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {value ? (
        <div className="mt-8 font-semibold text-4xl tabular-nums tracking-tight sm:text-5xl">
          {value}
        </div>
      ) : null}
      {meta ? <div className="mt-4">{meta}</div> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
