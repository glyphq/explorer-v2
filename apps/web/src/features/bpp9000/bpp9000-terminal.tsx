"use client";

import { Button, Chip } from "@heroui/react";
import { AsciiReveal, AsciiSkeleton } from "ascii-reveal";
import { RefreshIcon } from "@solar-icons/react/linear/refresh";
import { useCallback, useState, type ReactNode } from "react";

import { ErrorState } from "@/components/explorer/state";

import { AlignmentModal } from "./alignment-modal";
import { AlignmentSummary } from "./alignment-summary";
import { CallTape } from "./call-tape";
import { CurrentCall } from "./current-call";
import { EpochHeatmap } from "./epoch-heatmap";
import { formatUpdated } from "./format-time";
import { currentHour } from "./model";
import { NotifyToggle } from "./notify-toggle";
import { QaAccordion } from "./qa-accordion";
import { RecentCalls } from "./recent-decisions";
import { useBpp9000, useBppRace, useNowSeconds } from "./use-bpp9000";

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
        <NotifyToggle />
        <Chip size="sm" title="Calls refresh every 2 minutes; alignment every 5" variant="soft">
          Calls 2m · board 5m
        </Chip>
        <Button isDisabled={isFetching} onPress={onRefresh} size="sm" variant="tertiary">
          <RefreshIcon className={isFetching ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>
    </header>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  return (
    <AsciiReveal as="div" duration="fast" origin="top-left" preset="dither">
      {children}
    </AsciiReveal>
  );
}

export function Bpp9000Terminal() {
  const { data, error, isError, isFetching, isLoading, refetch } = useBpp9000();
  const raceQuery = useBppRace();
  const { refetch: refetchRace } = raceQuery;
  const now = useNowSeconds(1000);
  const [alignmentOpen, setAlignmentOpen] = useState(false);

  const refresh = useCallback(() => {
    refetch().catch(() => undefined);
    refetchRace().catch(() => undefined);
  }, [refetch, refetchRace]);
  const openAlignment = useCallback(() => setAlignmentOpen(true), []);

  const race = raceQuery.data?.race ?? null;
  const fetching = isFetching || raceQuery.isFetching;
  const updated = data ? formatUpdated(data.fetchedAt) : isError ? "Unavailable" : "Loading";
  const header = <TerminalHeader isFetching={fetching} onRefresh={refresh} updated={updated} />;

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

      <Reveal>
        <CurrentCall
          colony={data.colony}
          hour={hour}
          now={nowSeconds}
          onOpenAlignment={openAlignment}
          race={race}
          raceLoading={raceQuery.isPending}
        />
      </Reveal>

      <Reveal>
        <EpochHeatmap colony={data.colony} now={nowSeconds} />
      </Reveal>

      <Reveal>
        <CallTape colony={data.colony} now={nowSeconds} />
      </Reveal>

      <Reveal>
        <RecentCalls colony={data.colony} now={nowSeconds} />
      </Reveal>

      <AsciiReveal
        as="div"
        duration="fast"
        loading={!race && raceQuery.isPending}
        origin="top-left"
        preset="dither"
      >
        {race ? (
          <AlignmentSummary onOpen={openAlignment} race={race} />
        ) : raceQuery.isError ? (
          <AlignmentError message={raceQuery.error.message} onRetry={refresh} />
        ) : (
          <AlignmentSkeleton />
        )}
      </AsciiReveal>

      <Reveal>
        <QaAccordion colony={data.colony} race={race} />
      </Reveal>

      {race ? (
        <AlignmentModal onOpenChange={setAlignmentOpen} open={alignmentOpen} race={race} />
      ) : null}
    </div>
  );
}

function AlignmentError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section>
      <h2 className="font-medium text-foreground text-xl">Computor alignment</h2>
      <p className="mt-2 text-danger text-sm">{message}</p>
      <Button
        className="mt-3 h-auto justify-start px-0 text-muted text-sm"
        onPress={onRetry}
        variant="ghost"
      >
        Retry alignment
      </Button>
    </section>
  );
}

function AlignmentSkeleton() {
  return (
    <section className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AsciiSkeleton as="div" lines={1} variant="dither" widths={["10rem"]} />
        <AsciiSkeleton as="div" lines={1} variant="dither" widths={["5rem"]} />
      </div>
      <AsciiSkeleton as="div" className="mt-2" lines={1} variant="dither" widths={["48%"]} />
      <AsciiSkeleton as="div" className="mt-5" height={6} rows={1} variant="dither" />
      <AsciiSkeleton as="div" className="mt-3" lines={1} variant="dither" widths={["38%"]} />
      <AsciiSkeleton as="div" className="mt-2" lines={1} variant="dither" widths={["52%"]} />
    </section>
  );
}

function TerminalSkeleton() {
  return (
    <div aria-busy="true" className="space-y-10 overflow-hidden">
      <section className="pb-8">
        <AsciiSkeleton
          as="div"
          className="text-3xl"
          lines={3}
          variant="dither"
          widths={["82%", "58%", "38%"]}
        />
        <AsciiSkeleton
          as="div"
          className="mt-3 text-xs"
          lines={1}
          variant="dither"
          widths={["28%"]}
        />
        <div className="mt-6 flex flex-wrap gap-2">
          <AsciiSkeleton
            as="div"
            className="rounded-full"
            height={38}
            rows={2}
            variant="dither"
            width="9.5rem"
          />
          <AsciiSkeleton
            as="div"
            className="rounded-full"
            height={38}
            rows={2}
            variant="dither"
            width="8.5rem"
          />
          <AsciiSkeleton
            as="div"
            className="rounded-full"
            height={38}
            rows={2}
            variant="dither"
            width="9rem"
          />
        </div>
        <AsciiSkeleton as="div" className="mt-5" height={4} rows={1} variant="dither" />
        <AsciiSkeleton
          as="div"
          className="mt-5 text-xs"
          lines={1}
          variant="dither"
          widths={["55%"]}
        />
      </section>

      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <AsciiSkeleton
            as="div"
            className="text-xl"
            lines={1}
            variant="dither"
            widths={["8rem"]}
          />
          <AsciiSkeleton as="div" lines={1} variant="dither" widths={["7rem"]} />
        </div>
        <AsciiSkeleton
          as="div"
          className="mt-2 text-xs"
          lines={1}
          variant="dither"
          widths={["60%"]}
        />
        <AsciiSkeleton as="div" className="mt-5" height={180} rows={6} variant="dither" />
        <AsciiSkeleton
          as="div"
          className="mt-4 text-xs"
          lines={1}
          variant="dither"
          widths={["45%"]}
        />
      </section>

      <section>
        <AsciiSkeleton as="div" className="text-xl" lines={1} variant="dither" widths={["7rem"]} />
        <AsciiSkeleton
          as="div"
          className="mt-2 text-xs"
          lines={1}
          variant="dither"
          widths={["55%"]}
        />
        <AsciiSkeleton as="div" className="mt-5" height={320} rows={9} variant="dither" />
      </section>

      <section className="rounded-xl bg-surface p-5 sm:p-6">
        <AsciiSkeleton as="div" className="text-xl" lines={1} variant="dither" widths={["9rem"]} />
        <AsciiSkeleton as="div" className="mt-5" height={44} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={44} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={44} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={44} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={44} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={44} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={44} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={44} rows={2} variant="dither" />
      </section>

      <AlignmentSkeleton />

      <section>
        <AsciiSkeleton as="div" className="text-xl" lines={1} variant="dither" widths={["6rem"]} />
        <AsciiSkeleton as="div" className="mt-4" height={36} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={36} rows={2} variant="dither" />
        <AsciiSkeleton as="div" className="mt-1" height={36} rows={2} variant="dither" />
      </section>
    </div>
  );
}
