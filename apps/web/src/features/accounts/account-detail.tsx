"use client";

import { AsciiSkeleton } from "ascii-reveal";
import { type ReactNode, useCallback } from "react";

import { IdentityActions } from "@/components/explorer/identity-actions";
import { IdentityAvatar } from "@/components/explorer/identity-avatar";
import { TickLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { ErrorState } from "@/components/explorer/state";
import {
  pageRows,
  useIdentity,
  useIdentityActivity,
  useLiveIdentity,
  useMarket,
} from "@/lib/api/hooks";
import { formatInteger, formatQu, formatUsdValue, shorten } from "@/lib/format";

import { groupActivity } from "./activity-feed";
import { ActivityTable } from "./activity-table";

function MetricChip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-xs">
      <span className="text-muted">{label}</span>
      <span className="tabular font-medium text-foreground">{children}</span>
    </span>
  );
}

export function AccountDetail({ identity }: { identity: string }) {
  const identityQuery = useIdentity(identity);
  const liveIdentity = useLiveIdentity(identity);
  const market = useMarket();
  const activity = useIdentityActivity(identity, 25);
  const data = identityQuery.data?.data;
  const liveData = liveIdentity.data?.data;
  const activityGroups = groupActivity(pageRows(activity.data?.pages));
  const hasData = Boolean(data ?? liveData);
  const loading = !hasData && (identityQuery.isLoading || liveIdentity.isLoading);
  const failed = !loading && !hasData;
  const balance =
    liveData?.balance ??
    (data?.balance !== undefined && data.balance >= 0 ? data.balance : undefined);
  const incoming = liveData?.incoming_amount ?? data?.incoming_amount;
  const outgoing = liveData?.outgoing_amount ?? data?.outgoing_amount;
  const netFlow =
    incoming !== undefined && outgoing !== undefined ? incoming - outgoing : undefined;
  const price = market.data?.data.price_usd;
  const usdBalance = balance !== undefined && price !== undefined ? balance * price : undefined;
  const transferCount =
    data?.transfer_count ??
    (liveData
      ? (liveData.incoming_transfers ?? 0) + (liveData.outgoing_transfers ?? 0)
      : undefined);
  const latestLiveTick = liveData
    ? Math.max(liveData.latest_incoming_tick ?? 0, liveData.latest_outgoing_tick ?? 0)
    : 0;
  const lastSeenTick = data?.last_seen_tick ?? (latestLiveTick > 0 ? latestLiveTick : undefined);
  const fetchNextActivity = useCallback(() => {
    activity.fetchNextPage();
  }, [activity.fetchNextPage]);

  if (failed) {
    return (
      <div className="page-width px-4 py-8 lg:px-8">
        <ErrorState
          message="We couldn't reach a peer for this account. Try again in a moment."
          onRetry={() => {
            identityQuery.refetch();
            liveIdentity.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <section className="pb-8 sm:pb-10">
        <div className="flex min-w-0 flex-col items-start gap-3">
          <IdentityAvatar size={56} value={identity} />
          <p
            className="select-all break-all font-mono text-sm text-foreground tracking-tight sm:text-base"
            title={identity}
          >
            {identity}
          </p>
        </div>
        <div className="mt-5 font-semibold text-4xl tabular-nums tracking-tight sm:text-5xl">
          {loading ? (
            <AsciiSkeleton className="text-4xl sm:text-5xl" lines={1} widths={["8ch"]} />
          ) : (
            formatQu(balance)
          )}
        </div>
        <p className="tabular mt-1 text-muted text-xs">
          {usdBalance === undefined ? "—" : `≈ ${formatUsdValue(usdBalance)}`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <MetricChip label="incoming">{formatQu(incoming)}</MetricChip>
          <MetricChip label="outgoing">{formatQu(outgoing)}</MetricChip>
          <MetricChip label="net">
            {netFlow !== undefined && netFlow > 0 ? "+" : ""}
            {formatQu(netFlow)}
          </MetricChip>
          <MetricChip label="transfers">{formatInteger(transferCount)}</MetricChip>
          {data?.first_seen_tick === undefined ? null : (
            <MetricChip label="first seen">
              <TickLink tick={data.first_seen_tick} />
            </MetricChip>
          )}
          {lastSeenTick === undefined ? null : (
            <MetricChip label={data?.last_seen_tick === undefined ? "last transfer" : "last seen"}>
              <TickLink tick={lastSeenTick} />
            </MetricChip>
          )}
        </div>
        <div className="mt-6 flex flex-col items-start gap-3">
          <span className="flex items-baseline gap-2 text-xs">
            <span className="text-muted">Public key</span>
            <span className="font-mono text-foreground">
              {shorten(liveData?.public_key ?? data?.public_key, 14, 10)}
            </span>
          </span>
          <IdentityActions identity={identity} />
        </div>
      </section>

      <section className="pb-10 pt-4">
        <div className="mb-4">
          <h2 className="text-sm font-medium">Recent activity</h2>
          <p className="mt-1 text-muted text-xs">
            Transfers and contract calls involving this account.
          </p>
        </div>
        <ActivityTable groups={activityGroups} identity={identity} isLoading={activity.isLoading} />
        {activity.hasNextPage ? (
          <LoadMore
            fetchNextPage={fetchNextActivity}
            hasNextPage={activity.hasNextPage}
            isFetchingNextPage={activity.isFetchingNextPage}
            loaded={activityGroups.length}
          />
        ) : null}
      </section>
    </div>
  );
}
