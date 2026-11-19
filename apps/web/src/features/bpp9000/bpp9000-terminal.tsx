"use client";

import { Button, Card, Skeleton } from "@heroui/react";
import { RefreshIcon } from "@solar-icons/react/linear/refresh";
import { useCallback, useState } from "react";

import { ErrorState } from "@/components/explorer/state";

import { AlignmentModal } from "./alignment-modal";
import { CurrentCallCard } from "./current-call-card";
import { EpochHeatmap } from "./epoch-heatmap";
import { formatUpdated } from "./format-time";
import { currentHour } from "./model";
import { QaAccordion } from "./qa-accordion";
import { RecentCalls } from "./recent-decisions";
import { useBpp9000, useNowSeconds } from "./use-bpp9000";

export function Bpp9000Terminal() {
  const { data, error, isError, isFetching, isLoading, refetch } = useBpp9000();
  const now = useNowSeconds();
  const [alignmentOpen, setAlignmentOpen] = useState(false);

  const refresh = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const openAlignment = useCallback(() => setAlignmentOpen(true), []);

  if (isError && !data) {
    return <ErrorState message={error.message} onRetry={refresh} />;
  }

  if (isLoading || !data) {
    return <TerminalSkeleton />;
  }

  const fallbackNow = Math.floor(new Date(data.fetchedAt).getTime() / 1000);
  const nowSeconds = now ?? (Number.isFinite(fallbackNow) ? fallbackNow : 0);
  const hour = data.colony ? currentHour(data.colony.hours, nowSeconds) : null;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted text-xs tabular-nums">{formatUpdated(data.fetchedAt)}</span>
        <Button isDisabled={isFetching} onPress={refresh} size="sm" variant="tertiary">
          <RefreshIcon className={isFetching ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      {isError ? (
        <p className="px-1 text-danger text-xs">
          The latest refresh failed. Showing the last good reading.
        </p>
      ) : null}

      <CurrentCallCard
        colony={data.colony}
        hour={hour}
        now={nowSeconds}
        onOpenAlignment={openAlignment}
        race={data.race}
      />

      <EpochHeatmap colony={data.colony} now={nowSeconds} />

      <RecentCalls colony={data.colony} now={nowSeconds} />

      <QaAccordion colony={data.colony} race={data.race} />

      <AlignmentModal onOpenChange={setAlignmentOpen} open={alignmentOpen} race={data.race} />
    </div>
  );
}

function TerminalSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="mt-3 h-7 w-4/5 rounded-md" />
        <div className="mt-5 grid grid-cols-3 gap-4">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <Skeleton className="mt-4 h-4 w-3/4 rounded-md" />
      </Card>
      <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="mt-2 h-3 w-24 rounded-md" />
        <Skeleton className="mt-5 h-24 w-full rounded-md" />
        <Skeleton className="mt-3 h-9 w-full rounded-md" />
      </Card>
      <Card className="gap-0 bg-surface p-5 sm:p-6" variant="transparent">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="mt-3 h-12 w-full rounded-md" />
        <Skeleton className="mt-1.5 h-12 w-full rounded-md" />
        <Skeleton className="mt-1.5 h-12 w-full rounded-md" />
      </Card>
    </div>
  );
}
