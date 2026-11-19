import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heroui/react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

export function SectionLink({
  children = "See all",
  href,
  label,
}: {
  children?: ReactNode;
  href: Route;
  label: string;
}) {
  return (
    <Link
      aria-label={label}
      className="group inline-flex shrink-0 items-center gap-1 text-muted text-xs transition-colors hover:text-foreground"
      href={href}
    >
      {children}
      <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function SectionCard({
  action,
  children,
  className,
  contentClassName,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: string;
  title: string;
}) {
  return (
    <Card className={classNames("min-w-0 gap-4", className)}>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={classNames("min-w-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
