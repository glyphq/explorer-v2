"use client";

import { Button, Chip } from "@heroui/react";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";

import { formatInteger } from "@/lib/format";

import { formatClock } from "./format-time";
import type { BppRace } from "./types";

function raceClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return `${formatClock(Math.floor(date.getTime() / 1000))} UTC`;
}

export function AlignmentSummary({ onOpen, race }: { onOpen: () => void; race: BppRace | null }) {
  if (!race) {
    return null;
  }

  const total = Math.max(race.board.length, race.computors);
  const aligned = Math.min(race.ready, total);
  const notAligned = Math.max(0, total - aligned);
  const share = total > 0 ? (aligned / total) * 100 : 0;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-foreground text-xl">Computor alignment</h2>
          <p className="mt-1 text-muted text-sm">Networks at or below the epoch's error bar.</p>
        </div>
        <Chip color="success" size="sm" variant="soft">
          {formatInteger(aligned)} aligned
        </Chip>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${share.toFixed(1)}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm">
        <p className="text-muted">{formatInteger(notAligned)} not aligned</p>
        <p className="text-muted tabular-nums">
          {formatInteger(race.computors)} ranked · {formatInteger(race.quorum)} quorum
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-muted text-xs tabular-nums">
        <span>Best {formatInteger(race.best)} errors</span>
        <span>Bar {formatInteger(race.bar)} errors</span>
        <span>Board {raceClock(race.at)}</span>
      </div>

      <Button
        className="mt-3 h-auto justify-start px-0 text-muted text-sm hover:bg-transparent"
        onPress={onOpen}
        variant="ghost"
      >
        View all computors
        <AltArrowRightIcon className="size-3.5" />
      </Button>
    </section>
  );
}
