import type { ReactNode } from "react";

export function PageHeader({
  actions,
  description,
  children,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-semibold text-2xl text-foreground tracking-tight md:text-3xl">
          {title}
        </h1>
        {description ? (
          <div className="mt-2 max-w-2xl text-muted text-sm leading-6">{description}</div>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeading({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-medium text-foreground text-sm">{title}</h2>
        {description ? <p className="mt-1 text-muted text-xs leading-5">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
