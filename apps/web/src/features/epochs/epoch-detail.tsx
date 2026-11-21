"use client";

import { Chip, Skeleton } from "@heroui/react";
import { createColumnHelper } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { BoxLabel } from "@/components/explorer/box-label";
import { DataTable, tableFeaturesConfig } from "@/components/explorer/data-table";
import { CopyButton, IdentityLink, TickLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { SectionHeading } from "@/components/explorer/page-header";
import { usePageLoading } from "@/components/explorer/page-reveal";
import { ErrorState } from "@/components/explorer/state";
import type { Computor } from "@/lib/api/generated/types.gen";
import { pageRows, useEpoch, useEpochComputors, useTicks } from "@/lib/api/hooks";
import { formatInteger, formatTimestamp, formatTimestampCompact } from "@/lib/format";

const computorHelper = createColumnHelper<typeof tableFeaturesConfig, Computor>();
const epochComputorColumns = computorHelper.columns([
  computorHelper.accessor("computor_index", {
    cell: ({ getValue }) => <span className="tabular text-muted">{getValue()}</span>,
    header: "Index",
  }),
  computorHelper.accessor("identity", {
    cell: ({ getValue }) => <IdentityLink full identity={getValue()} />,
    header: "Identity",
  }),
]);

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

export function EpochDetail({ epoch }: { epoch: number }) {
  const valid = Number.isInteger(epoch) && epoch >= 0;
  const epochQuery = useEpoch(valid ? epoch : undefined);
  const computors = useEpochComputors(valid ? epoch : undefined);
  const ticks = useTicks(25, valid ? epoch : undefined);
  const data = epochQuery.data?.data;
  const computorRows = computors.data?.data ?? [];
  const tickRows = pageRows(ticks.data?.pages);
  usePageLoading(valid && (epochQuery.isLoading || computors.isLoading || ticks.isLoading));

  if (!valid) {
    return (
      <div className="page-width px-4 py-8 lg:px-8">
        <ErrorState message="An epoch must be a non-negative integer." />
      </div>
    );
  }

  const showComputors = computors.isLoading || computors.isError || computorRows.length > 0;
  const showTicks = ticks.isLoading || ticks.isError || tickRows.length > 0;

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <header className="pb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2.5 font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
              Epoch {formatInteger(epoch)}
              {epochQuery.isLoading ? (
                <Skeleton className="h-5 w-12 rounded-full" />
              ) : data ? (
                <Chip color={data.closed ? "default" : "success"} size="sm" variant="soft">
                  {data.closed ? "Closed" : "In Progress"}
                </Chip>
              ) : null}
            </h1>

            {data ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
                <MetaItem label="First tick">
                  <TickLink tick={data.first_tick} />
                </MetaItem>
                <MetaItem label="Last tick">
                  <TickLink tick={data.last_tick} />
                </MetaItem>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="rounded-lg bg-surface p-0.5">
              <CopyButton label="Copy epoch number" value={String(epoch)} />
            </div>
          </div>
        </div>

        {epochQuery.isError ? null : (
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            <Stat
              label="Ticks"
              loading={epochQuery.isLoading}
              value={formatInteger(data?.tick_count)}
            />
            <Stat
              label="Transactions"
              loading={epochQuery.isLoading}
              value={formatInteger(data?.transaction_count)}
            />
            <Stat
              label="Events"
              loading={epochQuery.isLoading}
              value={formatInteger(data?.event_count)}
            />
            <Stat
              label="Computors"
              loading={computors.isLoading}
              value={computors.isError ? "—" : formatInteger(computorRows.length)}
            />
          </dl>
        )}
      </header>

      {epochQuery.isError ? (
        <ErrorState
          message={epochQuery.error.message}
          onRetry={() => {
            epochQuery.refetch();
          }}
        />
      ) : (
        <>
          {showTicks ? (
            <section className="py-6">
              <SectionHeading description="Verified ticks in this epoch." title="Ticks" />
              {ticks.isError ? (
                <ErrorState
                  message={ticks.error.message}
                  onRetry={() => {
                    ticks.refetch();
                  }}
                />
              ) : (
                <>
                  {ticks.isLoading ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          className="h-20 animate-pulse rounded-xl bg-surface"
                          key={`tick-skeleton-${index}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {tickRows.map((tick) => {
                        if (tick.tick === undefined) {
                          return null;
                        }

                        return (
                          <Link
                            className="group rounded-xl bg-surface p-4 transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            href={`/ticks/${tick.tick}` as Route}
                            key={tick.tick}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-semibold text-foreground text-sm tabular-nums transition-colors group-hover:text-accent">
                                {formatInteger(tick.tick)}
                              </span>
                              <time
                                className="text-[10px] text-muted tabular-nums"
                                dateTime={tick.timestamp}
                                title={formatTimestamp(tick.timestamp)}
                              >
                                {formatTimestampCompact(tick.timestamp)}
                              </time>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              <span className="text-muted">
                                Transactions{" "}
                                <span className="font-medium text-foreground tabular-nums">
                                  {formatInteger(tick.transaction_count)}
                                </span>
                              </span>
                              <span className="text-muted">
                                Events{" "}
                                <span className="font-medium text-foreground tabular-nums">
                                  {formatInteger(tick.event_count)}
                                </span>
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {ticks.hasNextPage ? (
                    <LoadMore
                      fetchNextPage={() => {
                        ticks.fetchNextPage();
                      }}
                      hasNextPage={ticks.hasNextPage}
                      isFetchingNextPage={ticks.isFetchingNextPage}
                      loaded={tickRows.length}
                    />
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          {showComputors ? (
            <section className="py-6">
              <SectionHeading
                description="The computors elected for this epoch."
                title="Computor set"
              />
              {computors.isError ? (
                <ErrorState
                  message={computors.error.message}
                  onRetry={() => {
                    computors.refetch();
                  }}
                />
              ) : (
                <DataTable
                  columns={epochComputorColumns}
                  data={computorRows}
                  empty="No computor set indexed for this epoch."
                  isLoading={computors.isLoading}
                  loadingRows={8}
                  rowKey={(row) => String(row.computor_index)}
                />
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
