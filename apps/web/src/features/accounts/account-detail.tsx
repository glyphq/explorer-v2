"use client";

import { Button } from "@heroui/react";
import { AsciiSkeleton } from "ascii-reveal";
import { type ReactNode, useCallback, useState } from "react";
import { ContractMark } from "@/components/explorer/contract-mark";
import { useContract } from "@/components/explorer/contract-provider";
import { IdentityActions } from "@/components/explorer/identity-actions";
import { IdentityAvatar } from "@/components/explorer/identity-avatar";
import { TickLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { ErrorState } from "@/components/explorer/state";
import { isProfileUnavailable } from "@/features/profiles/api";
import { ProfileDialog } from "@/features/profiles/profile-dialog";
import { ProfileHeader, ProfileMeta } from "@/features/profiles/profile-header";
import { useProfile } from "@/features/profiles/use-profile";
import {
  pageRows,
  useIdentity,
  useIdentityActivity,
  useLiveIdentity,
  useMarket,
} from "@/lib/api/hooks";
import { classNames, formatInteger, formatQu, formatUsdValue, shorten } from "@/lib/format";

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

function AccountStats({
  balance,
  centered = false,
  firstSeenTick,
  incoming,
  lastSeenLabel,
  lastSeenTick,
  loading,
  netFlow,
  outgoing,
  transferCount,
  usdBalance,
}: {
  balance?: number;
  centered?: boolean;
  firstSeenTick?: number;
  incoming?: number;
  lastSeenLabel: string;
  lastSeenTick?: number;
  loading: boolean;
  netFlow?: number;
  outgoing?: number;
  transferCount?: number;
  usdBalance?: number;
}) {
  return (
    <div className={centered ? "text-center" : undefined}>
      <div className="font-semibold text-4xl tabular-nums tracking-tight sm:text-5xl">
        {loading ? (
          <AsciiSkeleton className="text-4xl sm:text-5xl" lines={1} widths={["8ch"]} />
        ) : (
          formatQu(balance)
        )}
      </div>
      <p className="tabular mt-1 text-muted text-xs">
        {usdBalance === undefined ? "—" : `≈ ${formatUsdValue(usdBalance)}`}
      </p>
      <div className={classNames("mt-5 flex flex-wrap gap-2", centered && "justify-center")}>
        <MetricChip label="incoming">{formatQu(incoming)}</MetricChip>
        <MetricChip label="outgoing">{formatQu(outgoing)}</MetricChip>
        <MetricChip label="net">
          {netFlow !== undefined && netFlow > 0 ? "+" : ""}
          {formatQu(netFlow)}
        </MetricChip>
        <MetricChip label="transfers">{formatInteger(transferCount)}</MetricChip>
        {firstSeenTick === undefined ? null : (
          <MetricChip label="first seen">
            <TickLink tick={firstSeenTick} />
          </MetricChip>
        )}
        {lastSeenTick === undefined ? null : (
          <MetricChip label={lastSeenLabel}>
            <TickLink tick={lastSeenTick} />
          </MetricChip>
        )}
      </div>
    </div>
  );
}

function PublicKeyLine({
  centered = false,
  publicKey,
}: {
  centered?: boolean;
  publicKey?: string;
}) {
  return (
    <span className={classNames("flex items-baseline gap-2 text-xs", centered && "justify-center")}>
      <span className="text-muted">Public key</span>
      <span className="font-mono text-foreground">{shorten(publicKey, 14, 10)}</span>
    </span>
  );
}

export function AccountDetail({ identity }: { identity: string }) {
  const contract = useContract(identity);
  const identityQuery = useIdentity(identity);
  const liveIdentity = useLiveIdentity(identity);
  const profileQuery = useProfile(identity);
  const market = useMarket();
  const activity = useIdentityActivity(identity, 25);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const data = identityQuery.data?.data;
  const liveData = liveIdentity.data?.data;
  const profile = profileQuery.data ?? null;
  const profileUnavailable = isProfileUnavailable(profileQuery.error);
  const profileReady = profileQuery.isSuccess;
  let profileAction: "claim" | "edit" | null = null;
  if (!contract && profileQuery.isSuccess) {
    if (profile === null) {
      profileAction = "claim";
    } else if (profile.kind === "wallet") {
      profileAction = "edit";
    }
  }
  const activityGroups = groupActivity(pageRows(activity.data?.pages));
  const hasData = Boolean(data ?? liveData);
  const loading =
    !hasData && (identityQuery.isLoading || liveIdentity.isLoading || profileQuery.isLoading);
  const failed = !(loading || hasData || profileReady);
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
        {contract ? (
          <div className="flex min-w-0 flex-col items-start gap-3">
            <ContractMark name={contract.name} size={56} />
            <div className="min-w-0">
              <p className="font-semibold text-xl tracking-tight">{contract.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted">
                <span className="rounded-full bg-surface-secondary px-2.5 py-1">
                  Smart contract
                </span>
                <span className="rounded-full bg-surface-secondary px-2.5 py-1">
                  Index {contract.index}
                </span>
                <span className="rounded-full bg-surface-secondary px-2.5 py-1">
                  {contract.assetName}
                </span>
              </div>
              <p
                className="mt-2 select-all break-all font-mono text-[11px] text-muted"
                title={identity}
              >
                {identity}
              </p>
              {profile ? <ProfileMeta profile={profile} /> : null}
            </div>
          </div>
        ) : profile ? (
          <ProfileHeader
            identity={identity}
            onProfileAction={() => setProfileDialogOpen(true)}
            profile={profile}
            profileAction={profileAction}
          >
            <AccountStats
              balance={balance}
              centered
              firstSeenTick={data?.first_seen_tick}
              incoming={incoming}
              lastSeenLabel={data?.last_seen_tick === undefined ? "last transfer" : "last seen"}
              lastSeenTick={lastSeenTick}
              loading={loading}
              netFlow={netFlow}
              outgoing={outgoing}
              transferCount={transferCount}
              usdBalance={usdBalance}
            />
            <div className="mt-5">
              <PublicKeyLine centered publicKey={liveData?.public_key ?? data?.public_key} />
            </div>
          </ProfileHeader>
        ) : (
          <div className="flex min-w-0 flex-col items-start gap-3">
            <IdentityAvatar size={56} value={identity} />
            <p
              className="select-all break-all font-mono text-foreground text-sm tracking-tight sm:text-base"
              title={identity}
            >
              {identity}
            </p>
          </div>
        )}
        {contract || !profile ? (
          <>
            <div className="mt-5">
              <AccountStats
                balance={balance}
                firstSeenTick={data?.first_seen_tick}
                incoming={incoming}
                lastSeenLabel={data?.last_seen_tick === undefined ? "last transfer" : "last seen"}
                lastSeenTick={lastSeenTick}
                loading={loading}
                netFlow={netFlow}
                outgoing={outgoing}
                transferCount={transferCount}
                usdBalance={usdBalance}
              />
            </div>
            <div className="mt-6 flex flex-col items-start gap-3">
              <PublicKeyLine publicKey={liveData?.public_key ?? data?.public_key} />
              <div className="flex flex-wrap items-center gap-2">
                <IdentityActions identity={identity} />
                {profileAction ? (
                  <Button onPress={() => setProfileDialogOpen(true)} size="sm" variant="outline">
                    {profileAction === "edit" ? "Edit profile" : "Claim profile"}
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section className="pt-4 pb-10">
        <div className="mb-4">
          <h2 className="font-medium text-sm">Recent activity</h2>
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

      {contract || profileUnavailable ? null : (
        <ProfileDialog
          identity={identity}
          onOpenChange={setProfileDialogOpen}
          open={profileDialogOpen}
          profile={profile}
        />
      )}
    </div>
  );
}
