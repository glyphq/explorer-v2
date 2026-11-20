import type { Route } from "next";
import Link from "next/link";

import type { Tick } from "@/lib/api/generated/types.gen";
import {
  countLabel,
  formatInteger,
  formatTime,
  formatTimestamp,
  formatTimestampCompact,
} from "@/lib/format";

function tickHref(tick: Tick): Route {
  if (tick.tick === undefined) {
    return "/ticks" as Route;
  }

  return `/ticks/${tick.tick}` as Route;
}

export function TickTable({ ticks }: { ticks: Tick[] }) {
  const peak = Math.max(1, ...ticks.map((tick) => tick.transaction_count ?? 0));
  const eventPeak = Math.max(1, ...ticks.map((tick) => tick.event_count ?? 0));

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-[10px] text-muted uppercase tracking-[0.14em]">
              <th className="px-4 py-3 font-normal">Tick</th>
              <th className="hidden px-3 py-3 font-normal md:table-cell">Epoch</th>
              <th className="px-3 py-3 text-right font-normal">Txns</th>
              <th className="hidden px-3 py-3 text-right font-normal md:table-cell">Events</th>
              <th className="hidden px-3 py-3 text-right font-normal md:table-cell">Computor</th>
              <th className="px-4 py-3 text-right font-normal">Observed</th>
            </tr>
          </thead>
          <tbody>
            {ticks.map((tick) => (
              <tr
                className="group relative cursor-pointer transition-colors hover:bg-surface-secondary"
                key={`${tick.tick}-${tick.timestamp}`}
              >
                <td className="px-4 py-3">
                  <Link
                    className="font-semibold text-foreground text-sm tabular-nums transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
                    href={tickHref(tick)}
                  >
                    {formatInteger(tick.tick)}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted md:hidden">
                    <span>epoch {formatInteger(tick.epoch)}</span>
                    <span>{countLabel(tick.event_count, "event")}</span>
                    <span>computor {formatInteger(tick.computor_index)}</span>
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-muted text-xs md:table-cell">
                  {formatInteger(tick.epoch)}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-surface-secondary sm:block">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.max(
                            4,
                            Math.sqrt((tick.transaction_count ?? 0) / peak) * 100,
                          )}%`,
                        }}
                      />
                    </span>
                    <span className="text-foreground text-xs tabular-nums">
                      {formatInteger(tick.transaction_count)}
                    </span>
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-right md:table-cell">
                  <div className="flex items-center justify-end gap-2">
                    <span className="h-1 w-10 overflow-hidden rounded-full bg-success/15">
                      <span
                        className="block h-full rounded-full bg-success"
                        style={{
                          width:
                            (tick.event_count ?? 0) === 0
                              ? 0
                              : `${Math.max(
                                  8,
                                  Math.sqrt((tick.event_count ?? 0) / eventPeak) * 100,
                                )}%`,
                        }}
                      />
                    </span>
                    <span className="text-foreground text-xs tabular-nums">
                      {formatInteger(tick.event_count)}
                    </span>
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-right text-muted text-xs tabular-nums md:table-cell">
                  {formatInteger(tick.computor_index)}
                </td>
                <td className="px-4 py-3 text-right text-[10px] text-muted">
                  <time dateTime={tick.timestamp} title={formatTimestamp(tick.timestamp)}>
                    <span className="md:hidden">{formatTime(tick.timestamp)}</span>
                    <span className="hidden md:inline">
                      {formatTimestampCompact(tick.timestamp)}
                    </span>
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
