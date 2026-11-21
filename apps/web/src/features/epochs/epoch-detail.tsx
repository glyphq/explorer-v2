"use client";

import { Chip, Skeleton } from "@heroui/react";
import { ClockCircleIcon } from "@solar-icons/react/linear/clock-circle";
import { DocumentTextIcon } from "@solar-icons/react/linear/document-text";
import { LayersIcon } from "@solar-icons/react/linear/layers";
import { TransferHorizontalIcon } from "@solar-icons/react/linear/transfer-horizontal";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";

import { computorColumns, tickColumns } from "@/components/explorer/columns";
import { DataTable } from "@/components/explorer/data-table";
import { CopyButton, TickLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import { usePageLoading } from "@/components/explorer/page-reveal";
import { SectionCard } from "@/components/explorer/section-card";
import { KeyValue, StatCard } from "@/components/explorer/stat-card";
import { ErrorState } from "@/components/explorer/state";
import { pageRows, useEpoch, useEpochComputors, useTicks } from "@/lib/api/hooks";
import { formatInteger, formatTimestamp } from "@/lib/format";

export function EpochDetail({ epoch }: { epoch: number }) {
  const valid = Number.isInteger(epoch) && epoch >= 0;
  const epochQuery = useEpoch(valid ? epoch : undefined);
  const computors = useEpochComputors(valid ? epoch : undefined);
  const ticks = useTicks(25, valid ? epoch : undefined);
  const data = epochQuery.data?.data;
  const tickRows = pageRows(ticks.data?.pages);
  usePageLoading(valid && (epochQuery.isLoading || computors.isLoading || ticks.isLoading));

  if (!valid) {
    return (
      <div className="page-width px-4 py-8 lg:px-8">
        <ErrorState message="An epoch must be a non-negative integer." />
      </div>
    );
  }

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        actions={<CopyButton label="Copy epoch number" value={String(epoch)} />}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ClockCircleIcon className="size-3.5" />
            {formatTimestamp(data?.first_timestamp)} — {formatTimestamp(data?.last_timestamp)}
          </span>
        }
        title={`Epoch ${epoch}`}
      />

      {epochQuery.isError ? (
        <div className="mt-6">
          <ErrorState
            message={epochQuery.error.message}
            onRetry={() => void epochQuery.refetch()}
          />
        </div>
      ) : (
        <>
          <section className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              hint="from first to last tick"
              icon={<LayersIcon className="size-4" />}
              label="Ticks"
              value={
                epochQuery.isLoading ? (
                  <Skeleton className="h-7 w-20 rounded-md" />
                ) : (
                  formatInteger(data?.tick_count)
                )
              }
            />
            <StatCard
              hint="indexed range"
              icon={<TransferHorizontalIcon className="size-4" />}
              label="Transactions"
              value={
                epochQuery.isLoading ? (
                  <Skeleton className="h-7 w-24 rounded-md" />
                ) : (
                  formatInteger(data?.transaction_count)
                )
              }
            />
            <StatCard
              hint="decoded logs"
              icon={<DocumentTextIcon className="size-4" />}
              label="Events"
              value={
                epochQuery.isLoading ? (
                  <Skeleton className="h-7 w-24 rounded-md" />
                ) : (
                  formatInteger(data?.event_count)
                )
              }
            />
            <StatCard
              hint="epoch state"
              icon={<UsersGroupRoundedIcon className="size-4" />}
              label="State"
              value={
                epochQuery.isLoading ? (
                  <Skeleton className="h-7 w-20 rounded-md" />
                ) : (
                  <Chip color={data?.closed ? "default" : "success"} size="sm" variant="soft">
                    {data?.closed ? "closed" : "open"}
                  </Chip>
                )
              }
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <SectionCard description="Epoch range and indexed counts." title="Overview">
              <dl>
                <KeyValue label="Epoch" mono value={epoch} />
                <KeyValue label="State" value={data?.closed ? "closed" : "open"} />
                <KeyValue label="First tick" value={<TickLink tick={data?.first_tick} />} />
                <KeyValue label="Last tick" value={<TickLink tick={data?.last_tick} />} />
                <KeyValue
                  label="First observed"
                  mono
                  value={formatTimestamp(data?.first_timestamp)}
                />
                <KeyValue
                  label="Last observed"
                  mono
                  value={formatTimestamp(data?.last_timestamp)}
                />
                <KeyValue label="Ticks" mono value={formatInteger(data?.tick_count)} />
                <KeyValue
                  label="Transactions"
                  mono
                  value={formatInteger(data?.transaction_count)}
                />
                <KeyValue label="Events" mono value={formatInteger(data?.event_count)} />
              </dl>
            </SectionCard>

            <SectionCard description="The computors elected for this epoch." title="Computor set">
              {computors.isError ? (
                <ErrorState
                  message={computors.error.message}
                  onRetry={() => void computors.refetch()}
                />
              ) : (
                <DataTable
                  columns={computorColumns}
                  data={computors.data?.data ?? []}
                  empty="No computor set indexed for this epoch."
                  isLoading={computors.isLoading}
                  loadingRows={8}
                  rowKey={(row) => String(row.computor_index)}
                />
              )}
            </SectionCard>
          </section>

          <section className="mt-4">
            <SectionCard description="Ticks verified in this epoch." title="Ticks">
              <DataTable
                columns={tickColumns}
                data={tickRows}
                empty="No ticks indexed for this epoch."
                isLoading={ticks.isLoading}
                loadingRows={8}
                rowKey={(row) => String(row.tick)}
              />
              <LoadMore
                fetchNextPage={() => void ticks.fetchNextPage()}
                hasNextPage={ticks.hasNextPage}
                isFetchingNextPage={ticks.isFetchingNextPage}
                loaded={tickRows.length}
              />
            </SectionCard>
          </section>
        </>
      )}
    </div>
  );
}
