"use client";

import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { EventSummary } from "@/components/explorer/event-summary";
import type { Event } from "@/lib/api/generated/types.gen";
import { formatInteger } from "@/lib/format";

export function EventFeed({
  events,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
}: {
  events: Event[];
  fetchNextPage: () => void;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isLoading: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const count = events.length + (hasNextPage ? 1 : 0);
  const virtualizer = useVirtualizer({
    count: isLoading ? 7 : count,
    estimateSize: () => 96,
    getItemKey: (index) => {
      const event = events[index];
      return event ? `${event.log_id ?? event.tick}-${event.tx_hash ?? index}` : `row-${index}`;
    },
    getScrollElement: () => parentRef.current,
    overscan: 8,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="h-[78px] animate-pulse rounded-xl bg-surface-secondary" key={index} />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="px-4 py-16 text-center text-muted text-sm">No events indexed yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div
        className="h-[min(70svh,760px)] min-h-[420px] overflow-auto overscroll-contain p-2"
        ref={parentRef}
      >
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const event = events[item.index];
            if (!event) {
              return (
                <div
                  className="absolute inset-x-0 flex items-center justify-center py-5"
                  key="load-more"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <button
                    className="flex items-center gap-2 text-muted text-xs transition-colors hover:text-foreground disabled:opacity-50"
                    disabled={isFetchingNextPage}
                    onClick={fetchNextPage}
                    type="button"
                  >
                    <AltArrowDownIcon className="size-4" />
                    {isFetchingNextPage ? "Loading…" : "Load more events"}
                  </button>
                </div>
              );
            }

            return (
              <div
                className="absolute inset-x-0 rounded-xl px-3 py-3.5 transition-colors hover:bg-surface-secondary"
                data-index={item.index}
                key={item.key}
                ref={virtualizer.measureElement}
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <EventSummary event={event} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-4 py-2 text-[10px] text-muted">
        {formatInteger(events.length)} events loaded
      </div>
    </div>
  );
}
