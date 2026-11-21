"use client";

import type { ReactNode } from "react";

import { BoxLabel } from "@/components/explorer/box-label";
import { CopyButton, EpochLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { SectionHeading } from "@/components/explorer/page-header";
import { usePageLoading } from "@/components/explorer/page-reveal";
import { ErrorState } from "@/components/explorer/state";
import { groupTransactionEvents } from "@/features/accounts/activity-feed";
import { TickActivityTable } from "@/features/ticks/tick-activity-table";
import {
  pageRows,
  useTick,
  useTickEvents,
  useTickEvidence,
  useTickTransactions,
} from "@/lib/api/hooks";
import { classNames, formatInteger, formatTimestamp } from "@/lib/format";

function Stat({ label, loading, value }: { label: string; loading: boolean; value: ReactNode }) {
  return (
    <div>
      <dt>
        <BoxLabel>{label}</BoxLabel>
      </dt>
      <dd className="rounded-lg bg-surface px-3 py-2">
        {loading ? (
          <span className="block h-6 w-20 animate-pulse rounded bg-surface-secondary" />
        ) : (
          <span className="block font-semibold text-[13px] leading-5 tracking-tight sm:text-lg sm:leading-6">
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

function MetaItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-[11px] leading-4 [&_a]:text-[11px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{children}</span>
    </div>
  );
}

function EvidenceValue({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <dd
      className={classNames(
        "rounded-lg bg-surface px-3 py-2 text-foreground text-xs",
        mono && "break-all font-mono text-[11px] leading-4",
      )}
    >
      {children}
    </dd>
  );
}

function DigestValue({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <dd className="relative rounded-lg bg-surface py-2 pr-12 pl-3">
      <code className="block break-all font-mono text-[11px] text-foreground leading-4">
        {value ?? "—"}
      </code>
      {value ? (
        <CopyButton
          className="absolute top-1/2 right-1 -translate-y-1/2"
          label={`Copy ${label}`}
          value={value}
        />
      ) : null}
    </dd>
  );
}

export function TickDetail({ tick }: { tick: number }) {
  const valid = Number.isInteger(tick) && tick > 0;
  const tickQuery = useTick(valid ? tick : undefined);
  const transactions = useTickTransactions(tick, 25);
  const events = useTickEvents(tick, 100);
  const evidence = useTickEvidence(valid ? tick : undefined);
  const data = tickQuery.data?.data;
  const evidenceData = evidence.data?.data;
  const transactionRows = pageRows(transactions.data?.pages);
  const eventRows = pageRows(events.data?.pages);
  const groups = groupTransactionEvents(transactionRows, eventRows);
  usePageLoading(
    valid &&
      (tickQuery.isLoading || evidence.isLoading || transactions.isLoading || events.isLoading),
  );

  const warnings = (() => {
    if (!evidenceData?.warnings) {
      return [];
    }
    const visible = (warning: string) => !/reports log generation still pending/i.test(warning);
    try {
      const parsed = JSON.parse(evidenceData.warnings) as unknown;
      return (Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]).filter(visible);
    } catch {
      return [evidenceData.warnings].filter(visible);
    }
  })();

  if (!valid) {
    return (
      <div className="page-width px-4 py-8 lg:px-8">
        <ErrorState message="A tick must be a positive integer." />
      </div>
    );
  }

  const hasMore = Boolean(transactions.hasNextPage || events.hasNextPage);
  const showEvidence = evidence.isLoading || evidence.isError || Boolean(evidenceData);
  const showActivity =
    transactions.isLoading || events.isLoading || transactions.isError || events.isError
      ? true
      : groups.length > 0;

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <header className="pb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
              Tick {formatInteger(tick)}
            </h1>

            {tickQuery.isLoading ? (
              <span className="mt-2 block h-3 w-64 animate-pulse rounded bg-surface-secondary" />
            ) : data ? (
              <div className="mt-1.5 text-[11px] text-muted">
                <time dateTime={data.timestamp} title={formatTimestamp(data.timestamp)}>
                  {formatTimestamp(data.timestamp)}
                </time>
              </div>
            ) : null}

            {data ? (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                <MetaItem label="Epoch">
                  <EpochLink epoch={data.epoch} />
                </MetaItem>
                <MetaItem label="Computor">{formatInteger(data.computor_index)}</MetaItem>
                <MetaItem label="Verification">{data.verification ?? "—"}</MetaItem>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="rounded-lg bg-surface p-0.5">
              <CopyButton label="Copy tick number" value={String(tick)} />
            </div>
          </div>
        </div>

        {tickQuery.isError ? null : (
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            <Stat
              label="Transactions"
              loading={tickQuery.isLoading}
              value={formatInteger(data?.transaction_count)}
            />
            <Stat
              label="Events"
              loading={tickQuery.isLoading}
              value={formatInteger(data?.event_count)}
            />
            <Stat
              label="Aligned votes"
              loading={evidence.isLoading}
              value={evidence.isError ? "—" : formatInteger(evidenceData?.aligned_votes)}
            />
            <Stat
              label="Unique votes"
              loading={evidence.isLoading}
              value={evidence.isError ? "—" : formatInteger(evidenceData?.unique_votes)}
            />
          </dl>
        )}
      </header>

      {tickQuery.isError ? (
        <ErrorState
          message={tickQuery.error.message}
          onRetry={() => {
            tickQuery.refetch();
          }}
        />
      ) : (
        <>
          {showEvidence ? (
            <section className="py-6">
              <SectionHeading
                description="Votes and digests that verified this tick."
                title="Quorum evidence"
              />
              {evidence.isError ? (
                <ErrorState
                  message={evidence.error.message}
                  onRetry={() => {
                    evidence.refetch();
                  }}
                />
              ) : evidence.isLoading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      className="h-16 animate-pulse rounded-lg bg-surface"
                      key={`evidence-skeleton-${index}`}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <dl className="grid gap-3 md:grid-cols-2">
                    <div>
                      <dt>
                        <BoxLabel>Required votes</BoxLabel>
                      </dt>
                      <EvidenceValue mono>
                        {formatInteger(evidenceData?.required_votes)}
                      </EvidenceValue>
                    </div>
                    <div>
                      <dt>
                        <BoxLabel>Quorum digest</BoxLabel>
                      </dt>
                      <DigestValue label="quorum digest" value={evidenceData?.quorum_digest} />
                    </div>
                    <div className="md:col-span-2">
                      <dt>
                        <BoxLabel>Tick data digest</BoxLabel>
                      </dt>
                      <DigestValue
                        label="tick data digest"
                        value={evidenceData?.tick_data_digest}
                      />
                    </div>
                  </dl>
                  {warnings.length > 0 ? (
                    <div className="mt-4 space-y-1 text-muted text-xs leading-5">
                      {warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          {showActivity ? (
            <section className="py-6">
              <SectionHeading
                description="Transfers and contract calls in this tick."
                title="Activity"
              />
              {transactions.isError || events.isError ? (
                <ErrorState
                  message={
                    (transactions.error ?? events.error)?.message ?? "Activity could not be loaded."
                  }
                  onRetry={() => {
                    transactions.refetch();
                    events.refetch();
                  }}
                />
              ) : (
                <TickActivityTable
                  groups={groups}
                  isLoading={transactions.isLoading || events.isLoading}
                />
              )}
              {hasMore ? (
                <LoadMore
                  fetchNextPage={() => {
                    if (transactions.hasNextPage) {
                      transactions.fetchNextPage();
                    }
                    if (events.hasNextPage) {
                      events.fetchNextPage();
                    }
                  }}
                  hasNextPage={hasMore}
                  isFetchingNextPage={transactions.isFetchingNextPage || events.isFetchingNextPage}
                  loaded={groups.length}
                />
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
