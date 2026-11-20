import type { Route } from "next";
import Link from "next/link";

import {
  countLabel,
  formatDate,
  formatInteger,
  formatTimestamp,
  formatTimestampCompact,
} from "@/lib/format";
import { getEpochProgress } from "@/lib/epoch";
import type { Epoch } from "@/lib/api/generated/types.gen";

function epochHref(epoch: Epoch): Route {
  return `/epochs/${epoch.epoch}` as Route;
}

function EpochTable({ epochs }: { epochs: Epoch[] }) {
  const txPeak = Math.max(1, ...epochs.map((epoch) => epoch.transaction_count ?? 0));
  const eventPeak = Math.max(1, ...epochs.map((epoch) => epoch.event_count ?? 0));
  const now = new Date();

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-[10px] text-muted uppercase tracking-[0.14em]">
              <th className="px-4 py-3 font-normal">Epoch</th>
              <th className="hidden px-3 py-3 font-normal md:table-cell">Start tick</th>
              <th
                className="hidden px-3 py-3 font-normal md:table-cell"
                title="The latest indexed tick for an open epoch."
              >
                End tick
              </th>
              <th className="px-3 py-3 text-right font-normal">Ticks</th>
              <th className="hidden px-3 py-3 text-right font-normal md:table-cell">Txns</th>
              <th className="hidden px-3 py-3 text-right font-normal md:table-cell">Events</th>
              <th className="px-4 py-3 text-right font-normal">Observed</th>
            </tr>
          </thead>
          <tbody>
            {epochs.map((epoch) => {
              const progress = epoch.closed ? undefined : getEpochProgress(now);

              return (
                <tr
                  className={`group relative cursor-pointer transition-colors hover:bg-surface-secondary ${
                    epoch.closed ? "" : "glyph-epoch-pulse"
                  }`}
                  key={epoch.epoch}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        className="font-semibold text-foreground text-sm tabular-nums transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
                        href={epochHref(epoch)}
                      >
                        {formatInteger(epoch.epoch)}
                      </Link>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted md:hidden">
                      <span>
                        {formatInteger(epoch.first_tick)} → {formatInteger(epoch.last_tick)}
                      </span>
                      <span>{countLabel(epoch.transaction_count, "transaction")}</span>
                      <span>{countLabel(epoch.event_count, "event")}</span>
                    </div>
                    {progress ? (
                      <div
                        aria-label={`Epoch ${formatInteger(epoch.epoch)} in progress`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={Math.round(progress.progress * 100)}
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-surface-secondary"
                        role="progressbar"
                        title={`Epoch resets ${formatTimestamp(progress.end.toISOString())}`}
                      >
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-700 motion-reduce:transition-none"
                          style={{ width: `${progress.progress * 100}%` }}
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="hidden px-3 py-3 text-muted text-xs tabular-nums md:table-cell">
                    {formatInteger(epoch.first_tick)}
                  </td>
                  <td className="hidden px-3 py-3 text-muted text-xs tabular-nums md:table-cell">
                    {formatInteger(epoch.last_tick)}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground text-xs tabular-nums">
                    {formatInteger(epoch.tick_count)}
                  </td>
                  <td className="hidden px-3 py-3 text-right md:table-cell">
                    <div className="flex items-center justify-end gap-2">
                      <span className="h-1 w-10 overflow-hidden rounded-full bg-surface-secondary">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{
                            width: `${Math.max(
                              4,
                              Math.sqrt((epoch.transaction_count ?? 0) / txPeak) * 100,
                            )}%`,
                          }}
                        />
                      </span>
                      <span className="text-foreground text-xs tabular-nums">
                        {formatInteger(epoch.transaction_count)}
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
                              (epoch.event_count ?? 0) === 0
                                ? 0
                                : `${Math.max(
                                    8,
                                    Math.sqrt((epoch.event_count ?? 0) / eventPeak) * 100,
                                  )}%`,
                          }}
                        />
                      </span>
                      <span className="text-foreground text-xs tabular-nums">
                        {formatInteger(epoch.event_count)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] text-muted">
                    <time
                      dateTime={epoch.last_timestamp}
                      title={formatTimestamp(epoch.last_timestamp)}
                    >
                      <span className="md:hidden">{formatDate(epoch.last_timestamp)}</span>
                      <span className="hidden md:inline">
                        {formatTimestampCompact(epoch.last_timestamp)}
                      </span>
                    </time>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { EpochTable };
