"use client";

import { useCallback, useState } from "react";

import { classNames, formatInteger } from "@/lib/format";

import { formatDayClock, formatHourRange } from "./format-time";
import {
  accuracyPercent,
  callLabel,
  currentHour,
  directionLabel,
  epochDays,
  majorityShare,
  statusLabel,
} from "./model";
import type { BppColony, BppHour, BppHourStatus } from "./types";

const toneClass: Record<BppHourStatus, string> = {
  correct: "bg-success/80 hover:bg-success",
  incorrect: "bg-danger/80 hover:bg-danger",
  no_consensus: "bg-foreground/30 hover:bg-foreground/40",
  not_scored: "bg-surface-secondary hover:bg-foreground/15",
  waiting: "bg-surface-secondary/55 hover:bg-foreground/10",
};

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={classNames("size-2 rounded-[2px]", className)} />
      {label}
    </span>
  );
}

function hourDetail(hour: BppHour, isCurrent: boolean): string {
  const pieces = [`Hour ${hour.hour}`, formatHourRange(hour.at)];
  if (hour.voters === 0) {
    pieces.push("No votes yet");
  } else {
    pieces.push(callLabel(hour.said));
    pieces.push(
      hour.went ? `Bitcoin ${directionLabel(hour.went).toLowerCase()}` : "Bitcoin not closed",
    );
    pieces.push(`${formatInteger(hour.voters)} voters`);
    pieces.push(`${(majorityShare(hour) ?? 0).toFixed(0)}% agreed`);
    pieces.push(hour.status === "waiting" ? "Open" : statusLabel(hour.status));
  }
  if (isCurrent) {
    pieces.push("current hour");
  }
  return pieces.join(" · ");
}

function HeatmapCell({
  hour,
  isActive,
  isCurrent,
  onClear,
  onSelect,
}: {
  hour: BppHour;
  isActive: boolean;
  isCurrent: boolean;
  onClear: () => void;
  onSelect: (hour: number) => void;
}) {
  const handleSelect = useCallback(() => onSelect(hour.hour), [hour.hour, onSelect]);
  const detail = hourDetail(hour, isCurrent);

  return (
    <button
      aria-label={detail}
      className={classNames(
        "aspect-square min-h-4 rounded-[2px] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground focus-visible:outline-offset-1",
        toneClass[hour.status],
        isCurrent && "outline outline-1 outline-foreground outline-offset-1",
        isActive && "opacity-100",
        !isActive && "opacity-90",
      )}
      onBlur={onClear}
      onClick={handleSelect}
      onFocus={handleSelect}
      onMouseEnter={handleSelect}
      onMouseLeave={onClear}
      title={detail}
      type="button"
    />
  );
}

export function EpochHeatmap({ colony, now }: { colony: BppColony | null; now: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectHour = useCallback((hour: number) => setSelected(hour), []);
  const clearSelected = useCallback(() => setSelected(null), []);

  if (!colony) {
    return (
      <section>
        <h2 className="font-medium text-foreground text-xl">This epoch</h2>
        <p className="mt-2 text-muted text-sm leading-6">Epoch data is not available right now.</p>
      </section>
    );
  }

  const days = epochDays(colony, now);
  const current = currentHour(colony.hours, now);
  const hours = days.flatMap((day) => day.cells).filter((hour): hour is BppHour => hour !== null);
  const active =
    hours.find((hour) => hour.hour === selected) ??
    hours.find((hour) => hour.hour === current?.hour) ??
    hours.at(-1) ??
    null;
  const accuracy = accuracyPercent(colony);
  const elapsed = hours.length;
  const epochStart = colony.hours[0]?.at;
  const noConsensus = colony.hours.filter((hour) => hour.status === "no_consensus").length;
  const notScored = colony.hours.filter((hour) => hour.status === "not_scored").length;
  const waiting = hours.filter((hour) => hour.status === "waiting").length;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="font-medium text-foreground text-xl">
            Epoch {formatInteger(colony.epoch)}
          </h2>
          <p className="mt-1 text-muted text-sm">
            {formatInteger(elapsed)} of {formatInteger(colony.totalHours)} hours
            {epochStart ? ` since ${formatDayClock(epochStart)} UTC` : " elapsed"}
          </p>
        </div>
        <p className="font-medium text-2xl text-foreground tabular-nums">
          {accuracy === null ? "—" : `${accuracy.toFixed(0)}%`}{" "}
          <span className="font-normal text-muted text-sm">factual accuracy</span>
        </p>
      </div>

      <p className="mt-2 text-muted text-sm">
        {formatInteger(colony.scored.correct)} right, {formatInteger(colony.scored.incorrect)}{" "}
        wrong. {formatInteger(noConsensus)} no-consensus and {formatInteger(notScored)} not-scored
        hours are excluded.{waiting > 0 ? ` ${formatInteger(waiting)} open.` : ""}
      </p>

      <div className="mt-6">
        <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 sm:grid">
          <div />
          <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px] text-[10px] text-muted/70 leading-none">
            {Array.from({ length: 24 }, (_, index) => (
              <span className={index % 6 === 0 ? "" : "opacity-0"} key={index}>
                {String(index).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-1.5 space-y-1.5">
          {days.map((day) => (
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2" key={day.at}>
              <div className="self-start pt-0.5 text-muted text-xs sm:self-center sm:pt-0">
                {day.label}
              </div>
              <div className="grid grid-cols-[repeat(12,minmax(0,1fr))] gap-[2px] sm:grid-cols-[repeat(24,minmax(0,1fr))]">
                {day.cells.map((hour, index) =>
                  hour ? (
                    <HeatmapCell
                      hour={hour}
                      isActive={hour.hour === active?.hour}
                      isCurrent={hour.hour === current?.hour}
                      key={hour.at}
                      onClear={clearSelected}
                      onSelect={selectHour}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="aspect-square min-h-4"
                      key={`${day.at}-${index}`}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="mt-4 min-h-5 text-muted text-xs leading-5">
        {active
          ? hourDetail(active, active.hour === current?.hour)
          : "Hover, focus, or tap a square for detail."}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted text-xs">
        <Legend className={toneClass.correct} label="Right" />
        <Legend className={toneClass.incorrect} label="Wrong" />
        <Legend className={toneClass.no_consensus} label="No consensus" />
        <Legend className={toneClass.not_scored} label="Not scored" />
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] outline outline-1 outline-foreground outline-offset-1" />
          Now
        </span>
      </div>
    </section>
  );
}
