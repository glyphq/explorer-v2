"use client";

import { Card } from "@heroui/react";
import { ArrowDownIcon } from "@solar-icons/react/linear/arrow-down";
import { ArrowUpIcon } from "@solar-icons/react/linear/arrow-up";

import { classNames, formatInteger } from "@/lib/format";

import { formatDayClock } from "./format-time";
import { callLabel, directionLabel, majorityShare, recentDecisions, statusLabel } from "./model";
import type { BppColony, BppDirection, BppHour } from "./types";

function CallIcon({ direction }: { direction: BppDirection | null }) {
  if (direction === "up") {
    return <ArrowUpIcon className="size-3.5" />;
  }
  if (direction === "down") {
    return <ArrowDownIcon className="size-3.5" />;
  }
  return null;
}

function statusClass(status: BppHour["status"]): string {
  if (status === "correct") {
    return "text-success";
  }
  if (status === "incorrect") {
    return "text-danger";
  }
  return "text-muted";
}

function RecentRow({ hour }: { hour: BppHour }) {
  const share = majorityShare(hour) ?? 0;
  const votes = Math.max(hour.up, hour.down);

  return (
    <li className="flex items-start justify-between gap-3 rounded-md bg-surface-secondary/55 px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <CallIcon direction={hour.said} />
          <span className="font-medium text-foreground">{callLabel(hour.said)}</span>
          <span className="text-muted text-xs">{formatDayClock(hour.at)}</span>
        </div>
        <p className="mt-0.5 text-muted text-xs tabular-nums">
          {formatInteger(votes)} of {formatInteger(hour.voters)} agreed · {share.toFixed(0)}%
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-muted text-xs">BTC {directionLabel(hour.went).toLowerCase()}</p>
        <p className={classNames("mt-0.5 font-medium text-xs", statusClass(hour.status))}>
          {statusLabel(hour.status)}
        </p>
      </div>
    </li>
  );
}

export function RecentCalls({ colony, now }: { colony: BppColony | null; now: number }) {
  const decisions = colony ? recentDecisions(colony.hours, now, 5) : [];

  return (
    <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-medium text-foreground text-lg">Recent calls</h2>
        <p className="text-muted text-xs">Last five closed hours</p>
      </div>

      {decisions.length === 0 ? (
        <p className="mt-3 text-muted text-sm leading-6">
          No hour has closed with a call yet in this epoch.
        </p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {decisions.map((hour) => (
            <RecentRow hour={hour} key={hour.at} />
          ))}
        </ul>
      )}
    </Card>
  );
}
