"use client";

import { AsciiSkeleton } from "ascii-reveal";
import { type ReactNode, useCallback } from "react";

import { IdentityActions } from "@/components/explorer/identity-actions";
import { IdentityAvatar } from "@/components/explorer/identity-avatar";
import { CopyableId, IdentityLink, TickLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { SectionCard } from "@/components/explorer/section-card";
import { ErrorState } from "@/components/explorer/state";
import type { Counterparty } from "@/lib/api/generated/types.gen";
import {
  pageRows,
  useIdentity,
  useIdentityActivity,
  useIdentityCounterparties,
  useLiveIdentity,
  useMarket,
} from "@/lib/api/hooks";
import { formatInteger, formatQu, formatUsdValue, shorten } from "@/lib/format";

import { ActivityFeed, groupActivity } from "./activity-feed";

function MetricChip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-xs">
      <span className="text-muted">{label}</span>
      <span className="tabular font-medium text-foreground">{children}</span>
    </span>
  );
}

function CounterpartyList({ isLoading, rows }: { isLoading?: boolean; rows: Counterparty[] }) {
  if (isLoading) {
    return <AsciiSkeleton as="div" height={140} rows={4} variant="dither" width="100%" />;
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted text-sm">No counterparties in the indexed range.</p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {rows.map((row) => {
        const net = row.net_amount ?? 0;
        return (
          <li
            className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-secondary"
            key={row.identity}
          >
            <IdentityLink avatar identity={row.identity} />
            <div className="tabular flex shrink-0 items-center gap-4 text-xs">
              <span className="hidden text-muted sm:inline">
                {formatInteger(row.transaction_count)} transfers
              </span>
              <span className={net >= 0 ? "text-foreground" : "text-muted"} title={formatQu(net)}>
                {net > 0 ? "+" : ""}
                {formatQu(net)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AccountDetail({ identity }: { identity: string }) {
  const identityQuery = useIdentity(identity);
  const liveIdentity = useLiveIdentity(identity);
  const market = useMarket();
  const counterparties = useIdentityCounterparties(identity, "all", 25);
  const activity = useIdentityActivity(identity, 25);
  const data = identityQuery.data?.data;
  const liveData = liveIdentity.data?.data;
  const activityGroups = groupActivity(pageRows(activity.data?.pages));
  const balance =
    liveData?.balance ??
    (data?.balance !== undefined && data.balance >= 0 ? data.balance : undefined);
  const incoming = liveData?.incoming_amount ?? data?.incoming_amount;
  const outgoing = liveData?.outgoing_amount ?? data?.outgoing_amount;
  const netFlow =
    incoming !== undefined && outgoing !== undefined ? incoming - outgoing : undefined;
  const price = market.data?.data.price_usd;
  const usdBalance = balance !== undefined && price !== undefined ? balance * price : undefined;
  const fetchNextActivity = useCallback(() => {
    activity.fetchNextPage();
  }, [activity.fetchNextPage]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 lg:px-8">
      {identityQuery.isError ? (
        <ErrorState message={identityQuery.error.message} onRetry={() => identityQuery.refetch()} />
      ) : (
        <div className="space-y-4">
          <section className="flex flex-col items-center px-4 py-8 text-center sm:py-12">
            <IdentityAvatar size={96} value={identity} />
            <h1 className="mt-5 font-semibold text-2xl tracking-tight">Account</h1>
            <div className="mt-2 max-w-full">
              <CopyableId value={identity} />
            </div>
            <div className="mt-7 font-semibold text-4xl tabular-nums tracking-tight sm:text-5xl">
              {identityQuery.isLoading || liveIdentity.isLoading ? (
                <AsciiSkeleton className="text-4xl sm:text-5xl" lines={1} widths={["8ch"]} />
              ) : (
                formatQu(balance)
              )}
            </div>
            <p className="tabular mt-1 text-muted text-xs">
              {usdBalance === undefined ? "—" : `≈ ${formatUsdValue(usdBalance)}`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <MetricChip label="incoming">{formatQu(incoming)}</MetricChip>
              <MetricChip label="outgoing">{formatQu(outgoing)}</MetricChip>
              <MetricChip label="net">
                {netFlow !== undefined && netFlow > 0 ? "+" : ""}
                {formatQu(netFlow)}
              </MetricChip>
              <MetricChip label="transfers">{formatInteger(data?.transfer_count)}</MetricChip>
              <MetricChip label="first seen">
                <TickLink tick={data?.first_seen_tick} />
              </MetricChip>
              <MetricChip label="last seen">
                <TickLink tick={data?.last_seen_tick} />
              </MetricChip>
            </div>
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="flex items-baseline gap-2 text-xs">
                <span className="text-muted">Public key</span>
                <span className="font-mono text-foreground">
                  {shorten(liveData?.public_key ?? data?.public_key, 14, 10)}
                </span>
              </span>
              <IdentityActions identity={identity} />
            </div>
          </section>

          <SectionCard title="Counterparties">
            <CounterpartyList
              isLoading={counterparties.isLoading}
              rows={counterparties.data?.data ?? []}
            />
          </SectionCard>

          <SectionCard
            description="Transactions with their decoded events attached."
            title="Recent activity"
          >
            <ActivityFeed
              groups={activityGroups}
              identity={identity}
              isLoading={activity.isLoading}
            />
            <LoadMore
              fetchNextPage={fetchNextActivity}
              hasNextPage={activity.hasNextPage}
              isFetchingNextPage={activity.isFetchingNextPage}
              loaded={activityGroups.length}
            />
          </SectionCard>
        </div>
      )}
    </div>
  );
}
