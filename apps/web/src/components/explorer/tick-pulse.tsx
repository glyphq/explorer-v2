"use client";

import { AsciiSkeleton } from "ascii-reveal";
import { AnimatePresence, motion } from "motion/react";
import type { Tick } from "@/lib/api/generated/types.gen";
import { useTickPulse } from "@/lib/api/hooks";
import { classNames, formatInteger, formatRelativeTime } from "@/lib/format";

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

export function TickPulse() {
  const { isLoading, ticks } = useTickPulse(100);
  const newest = ticks[0];

  return (
    <div>
      <div className="min-w-0">
        <p className="font-mono font-semibold text-2xl tracking-tight">
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

      {isLoading && ticks.length === 0 ? (
        <AsciiSkeleton
          as="div"
          className="mt-5"
          height={148}
          rows={5}
          variant="dither"
          width="100%"
        />
      ) : (
        <div className="relative mt-5 grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(20,minmax(0,1fr))]">
          <AnimatePresence initial={false} mode="popLayout">
            {ticks.map((tick, index) => (
              <motion.div
                animate={
                  index === 0 ? { opacity: 1, scale: [1, 1.12, 1] } : { opacity: 1, scale: 1 }
                }
                className={classNames(
                  "aspect-square rounded-[3px]",
                  index === 0 ? "bg-accent" : tone(tick),
                )}
                exit={{ opacity: 0, scale: 0.4 }}
                initial={{ opacity: 0, scale: 0.4 }}
                key={tick.tick ?? `${tick.timestamp}-${index}`}
                layout
                title={`Tick #${formatInteger(tick.tick)} · ${formatInteger(
                  tick.transaction_count,
                )} transactions · ${formatInteger(
                  tick.event_count,
                )} events · ${formatRelativeTime(tick.timestamp)}`}
                transition={
                  index === 0
                    ? {
                        opacity: { duration: 0.2 },
                        scale: {
                          duration: 2,
                          ease: "easeInOut",
                          repeat: Number.POSITIVE_INFINITY,
                        },
                      }
                    : { duration: 0.2, ease: "easeOut" }
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-[10px] text-muted uppercase tracking-[0.14em]">
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
