import type { Route } from "next";
import Link from "next/link";

import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import type { Epoch } from "@/lib/api/generated/types.gen";
import { getEpochProgress } from "@/lib/epoch";
import { formatInteger, formatTimestamp, formatTimestampCompact } from "@/lib/format";

function epochHref(epoch: Epoch): Route {
  return `/epochs/${epoch.epoch}` as Route;
}

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-10", header: "Epoch", width: "w-[12%]" },
  { barClassName: "w-16", header: "Start tick", width: "w-[14%]" },
  { barClassName: "w-16", header: "End tick", width: "w-[14%]" },
  { align: "right", barClassName: "w-10", header: "Ticks", width: "w-[9%]" },
  { align: "right", barClassName: "w-16", header: "Txns", width: "w-[17%]" },
  { align: "right", barClassName: "w-16", header: "Events", width: "w-[15%]" },
  { align: "right", barClassName: "w-24", header: "Observed", width: "w-[19%]" },
];

function EpochTable({ epochs }: { epochs: Epoch[] }) {
  const txPeak = Math.max(1, ...epochs.map((epoch) => epoch.transaction_count ?? 0));
  const eventPeak = Math.max(1, ...epochs.map((epoch) => epoch.event_count ?? 0));
  const now = new Date();

  return (
    <ActivityTable label="Epochs" minWidth="min-w-[920px]">
      <ActivityTableHead>
        <th className="w-[12%] px-4 py-3 font-normal">Epoch</th>
        <th className="w-[14%] px-3 py-3 font-normal">Start tick</th>
        <th
          className="w-[14%] px-3 py-3 font-normal"
          title="The latest indexed tick for an open epoch."
        >
          End tick
        </th>
        <th className="w-[9%] px-3 py-3 text-right font-normal">Ticks</th>
        <th className="w-[17%] px-3 py-3 text-right font-normal">Txns</th>
        <th className="w-[15%] px-3 py-3 text-right font-normal">Events</th>
        <th className="w-[19%] px-4 py-3 text-right font-normal">Observed</th>
      </ActivityTableHead>
      <tbody>
        {epochs.map((epoch) => {
          const progress = epoch.closed ? undefined : getEpochProgress(now);

          return (
            <ActivityTableRow className={epoch.closed ? "" : "glyph-epoch-pulse"} key={epoch.epoch}>
              <td className="px-4 py-3">
                <Link
                  className="font-semibold text-foreground text-sm tabular-nums transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
                  href={epochHref(epoch)}
                >
                  {formatInteger(epoch.epoch)}
                </Link>
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
              <td className="px-3 py-3 text-muted text-xs tabular-nums">
                {formatInteger(epoch.first_tick)}
              </td>
              <td className="px-3 py-3 text-muted text-xs tabular-nums">
                {formatInteger(epoch.last_tick)}
              </td>
              <td className="px-3 py-3 text-right text-foreground text-xs tabular-nums">
                {formatInteger(epoch.tick_count)}
              </td>
              <td className="px-3 py-3 text-right">
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
              <td className="px-3 py-3 text-right">
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
                <time dateTime={epoch.last_timestamp} title={formatTimestamp(epoch.last_timestamp)}>
                  {formatTimestampCompact(epoch.last_timestamp)}
                </time>
              </td>
            </ActivityTableRow>
          );
        })}
      </tbody>
    </ActivityTable>
  );
}

function EpochTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ActivityTableSkeleton
      columns={SKELETON_COLUMNS}
      label="Loading epochs"
      minWidth="min-w-[920px]"
      rows={rows}
    />
  );
}

export { EpochTable, EpochTableSkeleton };
