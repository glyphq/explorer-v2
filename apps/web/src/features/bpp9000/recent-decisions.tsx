"use client";

import { Card, Chip } from "@heroui/react";
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

  return (
    <tr>
      <td className="whitespace-nowrap py-3 pr-4 align-top text-muted text-xs tabular-nums">
        {formatDayClock(hour.at)}
      </td>
      <td className="py-3 pr-4 align-top">
        <span className="flex items-center gap-1.5 font-medium text-foreground text-sm">
          <CallIcon direction={hour.said} />
          {callLabel(hour.said)}
        </span>
      </td>
      <td className="hidden py-3 pr-4 text-right align-top text-sm tabular-nums sm:table-cell">
        {formatInteger(hour.up)}
      </td>
      <td className="hidden py-3 pr-4 text-right align-top text-sm tabular-nums sm:table-cell">
        {formatInteger(hour.down)}
      </td>
      <td className="hidden py-3 pr-4 text-right align-top text-muted text-sm tabular-nums sm:table-cell">
        {share.toFixed(0)}%
      </td>
      <td className="py-3 pr-4 align-top text-sm">{directionLabel(hour.went).toLowerCase()}</td>
      <td
        className={classNames(
          "whitespace-nowrap py-3 text-right align-top font-medium text-xs",
          statusClass(hour.status),
        )}
      >
        {statusLabel(hour.status)}
      </td>
    </tr>
  );
}

function RecentItem({ hour }: { hour: BppHour }) {
  const share = majorityShare(hour) ?? 0;

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted text-xs tabular-nums">{formatDayClock(hour.at)}</span>
        <span className={classNames("font-medium text-xs", statusClass(hour.status))}>
          {statusLabel(hour.status)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5 font-medium text-foreground text-sm">
          <CallIcon direction={hour.said} />
          {callLabel(hour.said)}
        </span>
        <span className="text-muted text-xs tabular-nums">
          {formatInteger(hour.up)} up · {formatInteger(hour.down)} down · {share.toFixed(0)}% agreed
        </span>
      </div>
      <p className="mt-0.5 text-muted text-xs">BTC {directionLabel(hour.went).toLowerCase()}</p>
    </li>
  );
}

export function RecentCalls({ colony, now }: { colony: BppColony | null; now: number }) {
  const decisions = colony ? recentDecisions(colony.hours, now, 8) : [];

  return (
    <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-medium text-foreground text-xl">Recent calls</h2>
        {decisions.length > 0 ? (
          <Chip size="sm" variant="soft">
            Last {decisions.length} closed hours
          </Chip>
        ) : null}
      </div>

      {decisions.length === 0 ? (
        <p className="mt-3 text-muted text-sm leading-6">
          No hour has closed with a call yet in this epoch.
        </p>
      ) : (
        <>
          <ul className="mt-2 sm:hidden">
            {decisions.map((hour) => (
              <RecentItem hour={hour} key={hour.at} />
            ))}
          </ul>
          <div className="mt-4 hidden sm:block">
            <table className="w-full text-left">
              <thead>
                <tr className="text-muted text-xs">
                  <th className="py-2 pr-4 font-normal">Time</th>
                  <th className="py-2 pr-4 font-normal">Call</th>
                  <th className="py-2 pr-4 text-right font-normal">Up</th>
                  <th className="py-2 pr-4 text-right font-normal">Down</th>
                  <th className="py-2 pr-4 text-right font-normal">Agreement</th>
                  <th className="py-2 pr-4 font-normal">Bitcoin</th>
                  <th className="py-2 text-right font-normal">Result</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((hour) => (
                  <RecentRow hour={hour} key={hour.at} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
