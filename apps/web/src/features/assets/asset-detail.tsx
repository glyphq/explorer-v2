"use client";

import { Skeleton } from "@heroui/react";
import { ClockCircleIcon } from "@solar-icons/react/linear/clock-circle";
import { DollarMinimalisticIcon } from "@solar-icons/react/linear/dollar-minimalistic";
import { LayersIcon } from "@solar-icons/react/linear/layers";
import { UsersGroupRoundedIcon } from "@solar-icons/react/linear/users-group-rounded";

import { holderColumns, transferColumns } from "@/components/explorer/columns";
import { useContractByIndex } from "@/components/explorer/contract-provider";
import { DataTable } from "@/components/explorer/data-table";
import { CopyButton, IdentityLink, TickLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import { SectionCard } from "@/components/explorer/section-card";
import { KeyValue, StatCard } from "@/components/explorer/stat-card";
import { ErrorState } from "@/components/explorer/state";
import { pageRows, useAsset, useAssetHolders, useAssetTransfers } from "@/lib/api/hooks";
import { formatInteger, formatTimestamp } from "@/lib/format";

export function AssetDetail({ issuer, name }: { issuer: string; name: string }) {
  const asset = useAsset(issuer, name);
  const holders = useAssetHolders(issuer, name, 200);
  const transfers = useAssetTransfers(issuer, name, "all", 50);
  const data = asset.data?.data;
  const managingContract = useContractByIndex(data?.managing_contract);
  const transferRows = pageRows(transfers.data?.pages);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        actions={<CopyButton label="Copy asset identifier" value={`${issuer}/${name}`} />}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ClockCircleIcon className="size-3.5" />
            issued at tick <TickLink tick={data?.issued_tick} /> · issuer{" "}
            <IdentityLink identity={issuer} />
          </span>
        }
        title={name}
      >
        <div className="mt-3 max-w-2xl rounded-lg border border-border bg-surface-secondary px-3 py-2 text-muted text-xs">
          Issuer <IdentityLink full identity={issuer} />
        </div>
      </PageHeader>

      {asset.isError ? (
        <div className="mt-6">
          <ErrorState message={asset.error.message} onRetry={() => void asset.refetch()} />
        </div>
      ) : (
        <>
          <section className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              hint="issuance"
              icon={<DollarMinimalisticIcon className="size-4" />}
              label="Shares"
              value={
                asset.isLoading ? (
                  <Skeleton className="h-7 w-24 rounded-md" />
                ) : (
                  formatInteger(data?.shares)
                )
              }
            />
            <StatCard
              hint="token precision"
              icon={<LayersIcon className="size-4" />}
              label="Decimals"
              value={
                asset.isLoading ? (
                  <Skeleton className="h-7 w-12 rounded-md" />
                ) : (
                  formatInteger(data?.decimals)
                )
              }
            />
            <StatCard
              hint="unit label"
              icon={<UsersGroupRoundedIcon className="size-4" />}
              label="Unit"
              value={
                asset.isLoading ? <Skeleton className="h-7 w-20 rounded-md" /> : (data?.unit ?? "—")
              }
            />
            <StatCard
              hint="indexed issuance"
              icon={<ClockCircleIcon className="size-4" />}
              label="Issued"
              value={
                asset.isLoading ? (
                  <Skeleton className="h-7 w-20 rounded-md" />
                ) : (
                  <TickLink tick={data?.issued_tick} />
                )
              }
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <SectionCard description="Issuance metadata." title="Overview">
              <dl>
                <KeyValue label="Name" mono value={data?.name ?? name} />
                <KeyValue label="Issuer" value={<IdentityLink full identity={issuer} />} />
                <KeyValue label="Unit" mono value={data?.unit ?? "—"} />
                <KeyValue label="Decimals" mono value={formatInteger(data?.decimals)} />
                <KeyValue label="Shares" mono value={formatInteger(data?.shares)} />
                <KeyValue label="Issued tick" value={<TickLink tick={data?.issued_tick} />} />
                <KeyValue
                  label="Managing contract"
                  mono={!managingContract}
                  value={
                    managingContract ? (
                      <IdentityLink identity={managingContract.address} />
                    ) : (
                      formatInteger(data?.managing_contract)
                    )
                  }
                />
                <KeyValue label="Observed" mono value={formatTimestamp(data?.timestamp)} />
              </dl>
            </SectionCard>

            <SectionCard description="Who holds this asset, according to a peer." title="Holders">
              {holders.isError ? (
                <ErrorState
                  message="No peer answered the asset holder lookup. The transfer history below is still local and authoritative."
                  onRetry={() => void holders.refetch()}
                />
              ) : (
                <DataTable
                  columns={holderColumns}
                  data={holders.data?.data ?? []}
                  empty="No holders returned for this asset."
                  isLoading={holders.isLoading}
                  loadingRows={6}
                  rowKey={(row) => row.identity}
                />
              )}
            </SectionCard>
          </section>

          <section className="mt-4">
            <SectionCard description="Ownership changes recorded in the index." title="Transfers">
              <DataTable
                columns={transferColumns}
                data={transferRows}
                empty="No ownership or possession transfers indexed."
                isLoading={transfers.isLoading}
                loadingRows={6}
                rowKey={(row) => `${row.kind}-${row.log_id}`}
              />
              <LoadMore
                fetchNextPage={() => void transfers.fetchNextPage()}
                hasNextPage={transfers.hasNextPage}
                isFetchingNextPage={transfers.isFetchingNextPage}
                loaded={transferRows.length}
              />
            </SectionCard>
          </section>
        </>
      )}
    </div>
  );
}
