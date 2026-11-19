"use client";

import { Button, Spinner } from "@heroui/react";
import { DangerTriangleIcon } from "@solar-icons/react/linear/danger-triangle";
import { InboxIcon } from "@solar-icons/react/linear/inbox";
import { RefreshIcon } from "@solar-icons/react/linear/refresh";
import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

export function EmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description?: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-surface-secondary text-muted">
        {icon ?? <InboxIcon className="size-5" />}
      </div>
      <p className="font-medium text-foreground text-sm">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-muted text-sm leading-6">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message = "The index didn't answer. Try again in a moment.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center" role="alert">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <DangerTriangleIcon className="size-5" />
      </div>
      <p className="font-medium text-foreground text-sm">Couldn't load this</p>
      <p className="mt-2 max-w-md text-muted text-sm leading-6">{message}</p>
      {onRetry ? (
        <Button className="mt-6" onPress={onRetry} size="sm" variant="secondary">
          <RefreshIcon className="size-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ className }: { className?: string }) {
  return (
    <div
      className={classNames(
        "flex min-h-40 items-center justify-center rounded-xl border border-border bg-surface",
        className,
      )}
    >
      <Spinner color="accent" size="sm" />
    </div>
  );
}
