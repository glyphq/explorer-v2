"use client";

import type { Tick } from "@/lib/api/generated/types.gen";
import { useTickPulse } from "@/lib/api/hooks";
import { classNames, formatInteger, formatRelativeTime } from "@/lib/format";

const SLOTS = 100;

function tone(tick: Tick): string {
  const count = tick.transaction_count ?? 0;
  if (count === 0) {
    return "bg-surface-secondary";
  }
  if (count < 10) {
    return "bg-foreground/15";
  }
  if (count < 20) {
    return "bg-foreground/30";
  }
  if (count < 35) {
    return "bg-foreground/50";
  }
  return "bg-foreground/70";
}

function tickTitle(tick: Tick): string {
  return `Tick #${formatInteger(tick.tick)} · ${formatInteger(
    tick.transaction_count,
  )} transactions · ${formatInteger(tick.event_count)} events · ${formatRelativeTime(
    tick.timestamp,
  )}`;
}

export function TickPulse() {
  const { isLoading, ticks } = useTickPulse(SLOTS);
  const newest = ticks[0];
  const slots = Array.from({ length: SLOTS }, (_, index) => ticks[index] ?? null);

  return (
    <div>
      <div className="min-w-0">
        <p className="truncate font-mono font-semibold text-2xl tabular-nums tracking-tight">
          {newest?.tick ? `#${formatInteger(newest.tick)}` : "—"}
        </p>
        <p className="mt-1 truncate text-muted text-xs">
          {newest
            ? `${formatInteger(newest.transaction_count)} tx · ${formatInteger(
                newest.event_count,
              )} events · ${formatRelativeTime(newest.timestamp)}`
            : "waiting for the next tick"}
        </p>
      </div>

      <div
        aria-busy={isLoading && ticks.length === 0}
        className="mt-5 grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(20,minmax(0,1fr))]"
      >
        {slots.map((tick, index) => (
          <div
            className={classNames(
              "aspect-square rounded-[3px] transition-colors duration-500",
              tick
                ? index === 0
                  ? "bg-accent ring-1 ring-accent/30 ring-inset"
                  : tone(tick)
                : "bg-surface-secondary/40",
            )}
            key={index}
            title={tick ? tickTitle(tick) : undefined}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[10px] text-muted tracking-[0.04em]">
        <span>last {formatInteger(ticks.length)} ticks</span>
        <span className="flex items-center gap-1.5">
          fewer
          <span className="size-2.5 rounded-[2px] bg-surface-secondary" />
          <span className="size-2.5 rounded-[2px] bg-foreground/15" />
          <span className="size-2.5 rounded-[2px] bg-foreground/30" />
          <span className="size-2.5 rounded-[2px] bg-foreground/50" />
          <span className="size-2.5 rounded-[2px] bg-foreground/70" />
          more
        </span>
      </div>
    </div>
  );
}
