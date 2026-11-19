"use client";

import { Card, Chip } from "@heroui/react";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { ArrowDownIcon } from "@solar-icons/react/linear/arrow-down";
import { ArrowUpIcon } from "@solar-icons/react/linear/arrow-up";
import { QuestionCircleIcon } from "@solar-icons/react/linear/question-circle";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";

import { formatInteger } from "@/lib/format";

import { formatClock, formatCountdown } from "./format-time";
import { callHeadline, hasConsensus, hourCloseAt, majorityShare } from "./model";
import type { BppColony, BppHour, BppRace } from "./types";

function CallIcon({
  className = "size-3.5",
  direction,
}: {
  className?: string;
  direction: BppHour["said"];
}) {
  if (direction === "up") {
    return <ArrowUpIcon className={className} />;
  }
  if (direction === "down") {
    return <ArrowDownIcon className={className} />;
  }
  return <QuestionCircleIcon className={className} />;
}

function callWord(hour: BppHour): string {
  if (hour.voters === 0) {
    return "Waiting";
  }
  if (hour.said === "up") {
    return "Up";
  }
  if (hour.said === "down") {
    return "Down";
  }
  return "No call";
}

function nextSentence(hour: BppHour, colony: BppColony, now: number, consensus: boolean): string {
  const closeAt = hourCloseAt(hour);
  if (hour.voters === 0) {
    return `Voting closes at ${formatClock(closeAt)} UTC. A call appears once ${formatInteger(colony.minimum)} computors have voted.`;
  }
  if (closeAt <= now) {
    return "This hour has closed. Its result is in the recent calls.";
  }
  if (!consensus) {
    return `At ${formatClock(closeAt)} UTC the hour closes. Without ${colony.agreement}% agreement it will not be scored.`;
  }
  return `At ${formatClock(closeAt)} UTC, Bitcoin's close decides whether the call was right.`;
}

export function CurrentCall({
  colony,
  hour,
  now,
  onOpenAlignment,
  race,
}: {
  colony: BppColony | null;
  hour: BppHour | null;
  now: number;
  onOpenAlignment: () => void;
  race: BppRace | null;
}) {
  if (!(colony && hour)) {
    return (
      <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
        <h2 className="font-medium text-2xl text-foreground">No call has been recorded yet.</h2>
        <p className="mt-2 text-muted text-sm leading-6">This page checks again every minute.</p>
      </Card>
    );
  }

  const share = majorityShare(hour) ?? 0;
  const consensus = hasConsensus(hour, colony.minimum, colony.agreement);
  const closesIn = hourCloseAt(hour) - now;
  const isOpen = closesIn > 0;
  const tone: "success" | "danger" | "default" =
    hour.said === "up" ? "success" : hour.said === "down" ? "danger" : "default";

  return (
    <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="max-w-3xl font-medium text-3xl text-foreground leading-[1.08] tracking-tight sm:text-4xl">
          {callHeadline(hour, colony.minimum, colony.agreement)}
        </h2>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Chip size="sm" variant="soft">
            Hour {hour.hour}
          </Chip>
          <Chip color={tone} size="sm" variant="soft">
            <span className="flex items-center gap-1.5">
              <CallIcon direction={hour.said} />
              {callWord(hour)}
            </span>
          </Chip>
        </div>
      </div>

      <p className="mt-3 text-muted text-sm tabular-nums">
        {formatClock(hour.at)}–{formatClock(hour.at + 3600)} UTC ·{" "}
        {isOpen
          ? `${formatCountdown(closesIn)} left`
          : `closed ${formatCountdown(Math.abs(closesIn))} ago`}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip className="h-auto px-3 py-2" size="md" variant="soft">
          <span className="flex items-baseline gap-2">
            <span className="text-muted text-xs">Agreement</span>
            <span className="font-medium text-base text-foreground tabular-nums">
              {hour.voters > 0 ? `${share.toFixed(0)}%` : "—"}
            </span>
            <span className="text-muted text-xs">{colony.agreement}% needed</span>
          </span>
        </Chip>
        <Chip className="h-auto px-3 py-2" size="md" variant="soft">
          <span className="flex items-baseline gap-2">
            <span className="text-muted text-xs">Votes</span>
            <span className="font-medium text-base text-foreground tabular-nums">
              {formatInteger(hour.voters)}
            </span>
            <span className="text-muted text-xs">
              {formatInteger(hour.up)} up · {formatInteger(hour.down)} down
            </span>
          </span>
        </Chip>
        {race ? (
          <button
            className="rounded-full text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground focus-visible:outline-offset-2"
            onClick={onOpenAlignment}
            type="button"
          >
            <Chip
              className="h-auto cursor-pointer px-3 py-2 hover:bg-surface-secondary"
              size="md"
              variant="soft"
            >
              <span className="flex items-center gap-2">
                <UsersGroupRoundedIcon className="size-3.5 text-muted" />
                <span className="text-muted text-xs">Aligned</span>
                <span className="font-medium text-base text-foreground tabular-nums">
                  {formatInteger(race.ready)}
                </span>
                <span className="text-muted text-xs">of {formatInteger(race.computors)}</span>
                <AltArrowRightIcon className="size-3 text-muted" />
              </span>
            </Chip>
          </button>
        ) : null}
      </div>

      <div aria-hidden="true" className="mt-5 flex items-center gap-3">
        <div className="relative h-1 flex-1 rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-foreground"
            style={{ width: `${Math.min(share, 100)}%` }}
          />
          <span
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-background"
            style={{ left: `${colony.agreement}%` }}
          />
        </div>
        <span className="text-muted text-xs tabular-nums">
          {share.toFixed(0)}% / {colony.agreement}%
        </span>
      </div>

      <p className="mt-5 max-w-2xl text-muted text-sm leading-6">
        {nextSentence(hour, colony, now, consensus)}
      </p>
    </Card>
  );
}
