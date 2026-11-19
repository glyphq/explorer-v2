"use client";

import { Button, Chip, Skeleton } from "@heroui/react";
import { RefreshIcon } from "@solar-icons/react/linear/refresh";
import { useCallback, useState } from "react";

import { ErrorState } from "@/components/explorer/state";

import { AlignmentModal } from "./alignment-modal";
import { AlignmentSummary } from "./alignment-summary";
import { CurrentCall } from "./current-call";
import { EpochHeatmap } from "./epoch-heatmap";
import { formatUpdated } from "./format-time";
import { currentHour } from "./model";
import { QaAccordion } from "./qa-accordion";
import { RecentCalls } from "./recent-decisions";
import { useBpp9000, useNowSeconds } from "./use-bpp9000";

function TerminalHeader({
  isFetching,
  onRefresh,
  updated,
}: {
  isFetching: boolean;
  onRefresh: () => void;
  updated: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-semibold text-2xl text-foreground tracking-tight md:text-3xl">
        BPP-9000
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted text-xs tabular-nums">{updated}</span>
        <Chip size="sm" title="Refreshes every 60 seconds" variant="soft">
          Every 60s
        </Chip>
        <Button isDisabled={isFetching} onPress={onRefresh} size="sm" variant="tertiary">
          <RefreshIcon className={isFetching ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>
    </header>
  );
}

export function Bpp9000Terminal() {
  const { data, error, isError, isFetching, isLoading, refetch } = useBpp9000();
  const now = useNowSeconds(1000);
  const [alignmentOpen, setAlignmentOpen] = useState(false);

  const refresh = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const openAlignment = useCallback(() => setAlignmentOpen(true), []);

  const updated = data ? formatUpdated(data.fetchedAt) : isError ? "Unavailable" : "Loading";
  const header = <TerminalHeader isFetching={isFetching} onRefresh={refresh} updated={updated} />;

  if (isError && !data) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState message={error.message} onRetry={refresh} />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-8">
        {header}
        <TerminalSkeleton />
      </div>
    );
  }

  const fallbackNow = Math.floor(new Date(data.fetchedAt).getTime() / 1000);
  const nowSeconds = now ?? (Number.isFinite(fallbackNow) ? fallbackNow : 0);
  const hour = data.colony ? currentHour(data.colony.hours, nowSeconds) : null;

  return (
    <div className="space-y-10">
      {header}

      {isError ? (
        <p className="text-danger text-xs">
          The latest refresh failed. Showing the last good reading.
        </p>
      ) : null}

      <CurrentCall
        colony={data.colony}
        hour={hour}
        now={nowSeconds}
        onOpenAlignment={openAlignment}
        race={data.race}
      />

      <EpochHeatmap colony={data.colony} now={nowSeconds} />

      <RecentCalls colony={data.colony} now={nowSeconds} />

      <AlignmentSummary onOpen={openAlignment} race={data.race} />

      <QaAccordion colony={data.colony} race={data.race} />

      {alignmentOpen ? (
        <AlignmentModal onOpenChange={setAlignmentOpen} open={alignmentOpen} race={data.race} />
      ) : null}
    </div>
  );
}

function TerminalSkeleton() {
  return (
    <div className="space-y-10">
      <div className="rounded-xl bg-surface p-5 sm:p-6">
        <div className="flex gap-5">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-9 w-4/5 rounded-md" />
            <Skeleton className="mt-3 h-4 w-52 rounded-md" />
            <div className="mt-8 flex flex-wrap gap-6">
              <Skeleton className="h-8 w-32 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-40 rounded-md" />
            </div>
            <Skeleton className="mt-5 h-1 w-full rounded-full" />
          </div>
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="mt-2 h-4 w-72 rounded-md" />
        <Skeleton className="mt-6 h-20 w-full rounded-md" />
        <Skeleton className="mt-4 h-4 w-3/4 rounded-md" />
      </div>
      <div className="rounded-xl bg-surface p-5 sm:p-6">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="mt-5 h-8 w-full rounded-md" />
        <Skeleton className="mt-1 h-8 w-full rounded-md" />
        <Skeleton className="mt-1 h-8 w-full rounded-md" />
        <Skeleton className="mt-1 h-8 w-full rounded-md" />
      </div>
      <div className="rounded-xl bg-surface p-5 sm:p-6">
        <Skeleton className="h-6 w-44 rounded-md" />
        <Skeleton className="mt-5 h-1 w-full rounded-full" />
        <Skeleton className="mt-4 h-4 w-2/3 rounded-md" />
      </div>
      <div>
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="mt-3 h-8 w-full rounded-md" />
        <Skeleton className="mt-1 h-8 w-full rounded-md" />
        <Skeleton className="mt-1 h-8 w-full rounded-md" />
      </div>
    </div>
  );
}
