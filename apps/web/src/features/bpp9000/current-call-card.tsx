"use client";

import { Button, Card } from "@heroui/react";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { ArrowDownIcon } from "@solar-icons/react/linear/arrow-down";
import { ArrowUpIcon } from "@solar-icons/react/linear/arrow-up";
import { QuestionCircleIcon } from "@solar-icons/react/linear/question-circle";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";

import { classNames, formatInteger } from "@/lib/format";

import { formatClock, formatCountdown } from "./format-time";
import { callHeadline, hasConsensus, hourCloseAt, majorityShare } from "./model";
import type { BppColony, BppHour, BppRace } from "./types";

function CallIcon({ direction }: { direction: BppHour["said"] }) {
  if (direction === "up") {
    return <ArrowUpIcon className="size-5" />;
  }
  if (direction === "down") {
    return <ArrowDownIcon className="size-5" />;
  }
  return <QuestionCircleIcon className="size-5" />;
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
    return "This hour has closed. Its result is in the recent calls below.";
  }
  if (!consensus) {
    return `At ${formatClock(closeAt)} UTC the hour closes. Without ${colony.agreement}% agreement it will not be scored.`;
  }
  return `At ${formatClock(closeAt)} UTC, Bitcoin's close decides whether the call was right.`;
}

export function CurrentCallCard({
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
        <p className="text-muted text-sm">This hour</p>
        <h2 className="mt-2 font-medium text-foreground text-xl">No call has been recorded yet.</h2>
        <p className="mt-2 text-muted text-sm leading-6">This page checks again every minute.</p>
      </Card>
    );
  }

  const share = majorityShare(hour) ?? 0;
  const consensus = hasConsensus(hour, colony.minimum, colony.agreement);
  const closesIn = hourCloseAt(hour) - now;
  const isOpen = closesIn > 0;
  const call = callWord(hour);

  return (
    <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted text-sm">
            This hour · {formatClock(hour.at)}–{formatClock(hour.at + 3600)} UTC
          </p>
          <h2 className="mt-1.5 max-w-2xl font-medium text-foreground text-xl leading-snug sm:text-2xl">
            {callHeadline(hour, colony.minimum, colony.agreement)}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-muted text-xs">Call</p>
          <div
            className={classNames(
              "mt-0.5 flex items-center justify-end gap-1.5 font-semibold text-2xl tracking-tight sm:text-3xl",
              hour.said === "up" && "text-success",
              hour.said === "down" && "text-danger",
              hour.said !== "up" && hour.said !== "down" && "text-muted",
            )}
          >
            <CallIcon direction={hour.said} />
            {call}
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <dt className="text-muted text-xs">Agreement</dt>
          <dd className="mt-1 font-medium text-foreground text-xl tabular-nums sm:text-2xl">
            {hour.voters > 0 ? `${share.toFixed(0)}%` : "—"}
          </dd>
          <p className="mt-0.5 text-muted text-xs">{colony.agreement}% needed</p>
        </div>
        <div>
          <dt className="text-muted text-xs">Votes</dt>
          <dd className="mt-1 font-medium text-foreground text-xl tabular-nums sm:text-2xl">
            {formatInteger(hour.voters)}
          </dd>
          <p className="mt-0.5 text-muted text-xs">
            {formatInteger(Math.max(hour.up, hour.down))} on the leading side
          </p>
        </div>
        <div>
          <dt className="text-muted text-xs">{isOpen ? "Resolves in" : "Closed"}</dt>
          <dd className="mt-1 font-medium text-foreground text-xl tabular-nums sm:text-2xl">
            {isOpen ? formatCountdown(closesIn) : `${formatCountdown(Math.abs(closesIn))} ago`}
          </dd>
          <p className="mt-0.5 text-muted text-xs">UTC</p>
        </div>
      </dl>

      <p className="mt-4 text-muted text-sm leading-6">
        {nextSentence(hour, colony, now, consensus)}
      </p>

      {race ? (
        <Button
          className="mt-3 h-auto justify-start px-0 text-muted text-sm hover:bg-transparent"
          onPress={onOpenAlignment}
          variant="ghost"
        >
          <UsersGroupRoundedIcon className="size-4" />
          {formatInteger(race.ready)} of {formatInteger(race.quorum)} computors aligned
          <AltArrowRightIcon className="size-3.5" />
        </Button>
      ) : null}
    </Card>
  );
}
