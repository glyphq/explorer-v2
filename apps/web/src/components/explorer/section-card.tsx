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
    <div
      className={classNames(
        "corner-frame corner-frame-card min-w-0 rounded-[6px] p-1.5",
        className,
      )}
    >
      <Card className="h-full min-w-0 gap-4 rounded-[4px] bg-surface ring-0">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? (
              <CardDescription className="mt-1 text-sm leading-6">{description}</CardDescription>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
        <CardContent className={classNames("min-w-0", contentClassName)}>{children}</CardContent>
      </Card>
    </div>
  );
}
