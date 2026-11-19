import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heroui/react";
import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

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
        {action}
      </CardHeader>
      <CardContent className={classNames("min-w-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
