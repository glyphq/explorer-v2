"use client";

import type { EventTypeCount } from "@/lib/api/generated/types.gen";
import { formatCompact, formatInteger } from "@/lib/format";

import { Skeleton } from "./skeleton";

export function EventTypeMosaic({
  events,
  isLoading,
}: {
  events: Array<EventTypeCount & { type_name?: string }>;
  isLoading?: boolean;
}) {
  if (isLoading && events.length === 0) {
    return <Skeleton height={180} />;
  }

  if (events.length === 0) {
    return <p className="py-12 text-center text-muted text-sm">No decoded events indexed.</p>;
  }

  const max = Math.max(1, ...events.map((event) => event.count));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {events.map((event) => {
        const type = event.type_name ?? event.type;
        return (
          <div className="corner-frame rounded-[4px] p-1" key={type}>
            <div className="group relative overflow-hidden rounded-[3px] bg-surface-secondary p-3 transition-colors hover:bg-surface-tertiary">
              <p
                className="truncate font-mono text-[10px] text-muted uppercase tracking-[0.12em]"
                title={type}
              >
                {type}
              </p>
              <p className="tabular mt-3 font-semibold text-xl tracking-tight">
                {formatCompact(event.count)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">{formatInteger(event.count)} decoded</p>
              <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-foreground/60"
                  style={{
                    width: `${Math.max(4, (event.count / max) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
