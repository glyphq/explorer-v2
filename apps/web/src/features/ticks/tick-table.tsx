import type { Route } from "next";
import Link from "next/link";

import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import type { Tick } from "@/lib/api/generated/types.gen";
import { formatInteger, formatTimestamp, formatTimestampCompact } from "@/lib/format";

function tickHref(tick: Tick): Route {
  if (tick.tick === undefined) {
    return "/ticks" as Route;
  }

  return `/ticks/${tick.tick}` as Route;
}

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-16", header: "Tick", width: "w-[16%]" },
  { barClassName: "w-10", header: "Epoch", width: "w-[12%]" },
  { align: "right", barClassName: "w-16", header: "Txns", width: "w-[21%]" },
  { align: "right", barClassName: "w-16", header: "Events", width: "w-[19%]" },
  { align: "right", barClassName: "w-12", header: "Computor", width: "w-[14%]" },
  { align: "right", barClassName: "w-24", header: "Observed", width: "w-[18%]" },
];

export function TickTable({ ticks }: { ticks: Tick[] }) {
  const peak = Math.max(1, ...ticks.map((tick) => tick.transaction_count ?? 0));
  const eventPeak = Math.max(1, ...ticks.map((tick) => tick.event_count ?? 0));

  return (
    <ActivityTable label="Ticks" minWidth="min-w-[820px]">
      <ActivityTableHead>
        <th className="w-[16%] px-4 py-3 font-normal">Tick</th>
        <th className="w-[12%] px-3 py-3 font-normal">Epoch</th>
        <th className="w-[21%] px-3 py-3 text-right font-normal">Txns</th>
        <th className="w-[19%] px-3 py-3 text-right font-normal">Events</th>
        <th className="w-[14%] px-3 py-3 text-right font-normal">Computor</th>
        <th className="w-[18%] px-4 py-3 text-right font-normal">Observed</th>
      </ActivityTableHead>
      <tbody>
        {ticks.map((tick) => (
          <ActivityTableRow key={`${tick.tick}-${tick.timestamp}`}>
            <td className="px-4 py-3">
              <Link
                className="font-semibold text-foreground text-xs tabular-nums transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
                href={tickHref(tick)}
              >
                {formatInteger(tick.tick)}
              </Link>
            </td>
            <td className="px-3 py-3 text-muted text-xs tabular-nums">
              {formatInteger(tick.epoch)}
            </td>
            <td className="px-3 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="h-1 w-10 overflow-hidden rounded-full bg-surface-secondary">
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
            <td className="px-3 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="h-1 w-10 overflow-hidden rounded-full bg-success/15">
                  <span
                    className="block h-full rounded-full bg-success"
                    style={{
                      width:
                        (tick.event_count ?? 0) === 0
                          ? 0
                          : `${Math.max(8, Math.sqrt((tick.event_count ?? 0) / eventPeak) * 100)}%`,
                    }}
                  />
                </span>
                <span className="text-foreground text-xs tabular-nums">
                  {formatInteger(tick.event_count)}
                </span>
              </div>
            </td>
            <td className="px-3 py-3 text-right text-muted text-xs tabular-nums">
              {formatInteger(tick.computor_index)}
            </td>
            <td className="px-4 py-3 text-right text-foreground text-xs tabular-nums">
              <time dateTime={tick.timestamp} title={formatTimestamp(tick.timestamp)}>
                {formatTimestampCompact(tick.timestamp)}
              </time>
            </td>
          </ActivityTableRow>
        ))}
      </tbody>
    </ActivityTable>
  );
}

function TickTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <ActivityTableSkeleton
      columns={SKELETON_COLUMNS}
      label="Loading ticks"
      minWidth="min-w-[820px]"
      rows={rows}
    />
  );
}

export { TickTableSkeleton };
