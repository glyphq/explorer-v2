"use client";

import { AsciiSkeleton } from "ascii-reveal";
import type { ReactNode } from "react";

import { EpochLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import { SectionCard } from "@/components/explorer/section-card";
import { ErrorState } from "@/components/explorer/state";
import { ActivityFeed, groupTransactionEvents } from "@/features/accounts/activity-feed";
import {
  pageRows,
  useTick,
  useTickEvents,
  useTickEvidence,
  useTickTransactions,
} from "@/lib/api/hooks";
import { formatInteger, formatTimestamp } from "@/lib/format";

function Field({ children, label, mono }: { children: ReactNode; label: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd
        className={
          mono
            ? "mt-1 break-words font-mono text-foreground text-xs"
            : "mt-1 break-words text-foreground text-sm"
        }
      >
        {children}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-2xl text-foreground tabular-nums">{value}</p>
    </div>
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

  const warnings = (() => {
    if (!evidenceData?.warnings) {
      return [];
    }
    try {
      const parsed = JSON.parse(evidenceData.warnings) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
    } catch {
      return [evidenceData.warnings];
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

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {formatTimestamp(data?.timestamp)}
            <span className="text-muted">·</span>
            <span>
              epoch <EpochLink epoch={data?.epoch} />
            </span>
          </span>
        }
        title={`Tick ${formatInteger(tick)}`}
      />

      {tickQuery.isError ? (
        <ErrorState
          message={tickQuery.error.message}
          onRetry={() => {
            tickQuery.refetch();
          }}
        />
      ) : (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl bg-surface p-5 sm:grid-cols-4 sm:p-6">
            <Metric
              label="Transactions"
              value={
                tickQuery.isLoading ? (
                  <AsciiSkeleton lines={1} widths={["3ch"]} />
                ) : (
                  formatInteger(data?.transaction_count)
                )
              }
            />
            <Metric
              label="Events"
              value={
                tickQuery.isLoading ? (
                  <AsciiSkeleton lines={1} widths={["3ch"]} />
                ) : (
                  formatInteger(data?.event_count)
                )
              }
            />
            <Metric
              label="Computor index"
              value={
                tickQuery.isLoading ? (
                  <AsciiSkeleton lines={1} widths={["3ch"]} />
                ) : (
                  formatInteger(data?.computor_index)
                )
              }
            />
            <Metric
              label="Verification"
              value={
                tickQuery.isLoading ? (
                  <AsciiSkeleton lines={1} widths={["5ch"]} />
                ) : (
                  <span className="text-base">{data?.verification ?? "—"}</span>
                )
              }
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <SectionCard title="Overview">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Tick" mono>
                  {formatInteger(data?.tick)}
                </Field>
                <Field label="Epoch">
                  <EpochLink epoch={data?.epoch} />
                </Field>
                <Field label="Computor" mono>
                  {formatInteger(data?.computor_index)}
                </Field>
                <Field label="Observed">
                  <span title={formatTimestamp(data?.timestamp)}>
                    {formatTimestamp(data?.timestamp)}
                  </span>
                </Field>
              </dl>
            </SectionCard>

            <SectionCard title="Quorum evidence">
              {evidence.isLoading ? (
                <AsciiSkeleton lines={4} widths={["100%", "88%", "92%", "74%"]} />
              ) : evidence.isError ? (
                <ErrorState
                  message={evidence.error.message}
                  onRetry={() => {
                    evidence.refetch();
                  }}
                />
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Verification" mono>
                    {evidenceData?.verification ?? "—"}
                  </Field>
                  <Field label="Aligned votes" mono>
                    {formatInteger(evidenceData?.aligned_votes)}
                  </Field>
                  <Field label="Required votes" mono>
                    {formatInteger(evidenceData?.required_votes)}
                  </Field>
                  <Field label="Unique votes" mono>
                    {formatInteger(evidenceData?.unique_votes)}
                  </Field>
                  <Field label="Quorum digest" mono>
                    {evidenceData?.quorum_digest ?? "—"}
                  </Field>
                  <Field label="Tick digest" mono>
                    {evidenceData?.tick_data_digest ?? "—"}
                  </Field>
                </dl>
              )}
              {warnings.length > 0 ? (
                <div className="mt-5 space-y-1 text-muted text-xs leading-5">
                  {warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}
            </SectionCard>
          </div>

          <SectionCard description="Transfers and contract calls in this tick." title="Activity">
            <ActivityFeed
              groups={groups}
              isLoading={transactions.isLoading || events.isLoading}
              showTick={false}
            />
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
          </SectionCard>
        </div>
      )}
    </div>
  );
}
