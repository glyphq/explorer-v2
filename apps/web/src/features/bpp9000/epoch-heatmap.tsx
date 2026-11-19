"use client";

import { Card } from "@heroui/react";
import { useCallback, useState } from "react";

import { classNames, formatInteger } from "@/lib/format";

import { formatHourRange } from "./format-time";
import {
  accuracyPercent,
  callLabel,
  currentHour,
  directionLabel,
  epochHours,
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
    pieces.push(statusLabel(hour.status));
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

  return (
    <button
      aria-label={hourDetail(hour, isCurrent)}
      className={classNames(
        "aspect-square rounded-[2px] transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground focus-visible:outline-offset-1",
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
      <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
        <h2 className="font-medium text-foreground text-lg">This epoch</h2>
        <p className="mt-2 text-muted text-sm leading-6">Epoch data is not available right now.</p>
      </Card>
    );
  }

  const cells = epochHours(colony, now);
  const current = currentHour(colony.hours, now);
  const active =
    cells.find((hour) => hour.hour === selected) ??
    cells.find((hour) => hour.hour === current?.hour) ??
    cells[0];
  const accuracy = accuracyPercent(colony);

  return (
    <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-medium text-foreground text-lg">
            Epoch {formatInteger(colony.epoch)}
          </h2>
          <p className="text-muted text-xs">
            Hour {formatInteger(current?.hour ?? colony.hoursKnown)} of{" "}
            {formatInteger(colony.totalHours)}
          </p>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium text-foreground">
            {formatInteger(colony.scored.correct)} right
          </span>
          <span aria-hidden="true" className="text-muted">
            ·
          </span>
          <span className="text-foreground">{formatInteger(colony.scored.incorrect)} wrong</span>
          <span aria-hidden="true" className="text-muted">
            ·
          </span>
          <span className="text-muted">
            {accuracy === null ? "No scored calls yet" : `${accuracy.toFixed(0)}% accuracy`}
          </span>
        </p>
      </div>

      <div
        className="mt-5 grid gap-[2px] sm:gap-[3px]"
        style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
      >
        {cells.map((hour) => {
          const isCurrent = hour.hour === current?.hour;
          const isActive = hour.hour === active?.hour;
          return (
            <HeatmapCell
              hour={hour}
              isActive={isActive}
              isCurrent={isCurrent}
              key={hour.hour}
              onClear={clearSelected}
              onSelect={selectHour}
            />
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="mt-3 min-h-9 rounded-md bg-surface-secondary/55 px-3 py-2 text-muted text-xs leading-5"
      >
        {active
          ? hourDetail(active, active.hour === current?.hour)
          : "Hover, focus, or tap a square for detail."}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted text-xs">
        <Legend className={toneClass.correct} label="Right" />
        <Legend className={toneClass.incorrect} label="Wrong" />
        <Legend className={toneClass.no_consensus} label="No consensus" />
        <Legend className={toneClass.waiting} label="Not scored / waiting" />
        <span className="text-muted/80">Outlined square is now</span>
      </div>
    </Card>
  );
}
