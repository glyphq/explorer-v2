"use client";

import { Button } from "@heroui/react";
import { AsciiSkeleton } from "ascii-reveal";
import { type ReactNode, useCallback, useState } from "react";
import { ContractMark, ZeroMark } from "@/components/explorer/contract-mark";
import { useContract } from "@/components/explorer/contract-provider";
import { IdentityActions } from "@/components/explorer/identity-actions";
import { IdentityAvatar } from "@/components/explorer/identity-avatar";
import { TickLink } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { ErrorState } from "@/components/explorer/state";
import { ExchangeLogoAvatar } from "@/features/exchanges/exchange-logo";
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
import { exchangeBrand } from "@/lib/exchanges/brands";
import { classNames, formatInteger, formatQu, formatUsdValue, shorten } from "@/lib/format";
import { isZeroIdentity } from "@/lib/transactions/special-hash";

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
      <div className="font-semibold text-[clamp(1.75rem,8vw,3rem)] tabular-nums tracking-tight sm:text-5xl">
        {loading ? (
          <AsciiSkeleton
            className="text-[clamp(1.75rem,8vw,3rem)] sm:text-5xl"
            lines={1}
            widths={["16ch"]}
          />
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

function ProfileLoading({
  identity,
  publicKey,
  ...stats
}: {
  identity: string;
  publicKey?: string;
} & Parameters<typeof AccountStats>[0]) {
  return (
    <>
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-2 text-center">
        <span className="inline-flex rounded-full bg-background p-1.5 ring-1 ring-border">
          <AsciiSkeleton circle height={112} rows={10} width={112} />
        </span>
        <div className="mt-4 flex min-w-0 flex-col items-center gap-1.5">
          <AsciiSkeleton className="text-3xl sm:text-4xl" lines={1} widths={["10rem"]} />
          <AsciiSkeleton className="text-[10px]" lines={1} widths={["4.5rem"]} />
        </div>
        <span
          className="mt-2 inline-flex max-w-full items-center rounded-full border border-border/80 bg-background/50 px-3 py-1 font-mono text-[11px] text-muted"
          title={identity}
        >
          <span className="hidden sm:inline">{identity}</span>
          <span className="sm:hidden">{shorten(identity, 10, 8)}</span>
        </span>
      </div>
      <div className="mx-auto mt-8 max-w-3xl">
        <AccountStats {...stats} centered />
        <div className="mt-5">
          <PublicKeyLine centered publicKey={publicKey} />
        </div>
        <div className="mt-5 flex justify-center">
          <AsciiSkeleton className="rounded-full" lines={1} widths={["9rem"]} />
        </div>
      </div>
    </>
  );
}

export function AccountDetail({ identity }: { identity: string }) {
  const zeroAddress = isZeroIdentity(identity);
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
  const profilePending = !zeroAddress && !contract && !profile && profileQuery.isLoading;
  const profileUnavailable = isProfileUnavailable(profileQuery.error);
  const profileReady = profileQuery.isSuccess;
  let profileAction: "claim" | "edit" | null = null;
  if (!zeroAddress && !contract && profileQuery.isSuccess) {
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
        ) : profilePending ? (
          <ProfileLoading
            balance={balance}
            firstSeenTick={data?.first_seen_tick}
            identity={identity}
            incoming={incoming}
            lastSeenLabel={data?.last_seen_tick === undefined ? "last transfer" : "last seen"}
            lastSeenTick={lastSeenTick}
            loading={loading}
            netFlow={netFlow}
            outgoing={outgoing}
            publicKey={liveData?.public_key ?? data?.public_key}
            transferCount={transferCount}
            usdBalance={usdBalance}
          />
        ) : profile ? (
          <ProfileHeader
            avatar={
              profile.kind === "exchange" && exchangeBrand(profile.displayName)?.icon ? (
                <ExchangeLogoAvatar name={profile.displayName} />
              ) : undefined
            }
            identity={identity}
            profile={profile}
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
            <div className="mt-5 flex justify-center">
              <div className="flex items-center rounded-full border border-border/70 bg-background/50 p-1">
                <IdentityActions
                  identity={identity}
                  onProfileAction={() => setProfileDialogOpen(true)}
                  profileAction={profileAction}
                />
              </div>
            </div>
          </ProfileHeader>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-2 text-center">
            <span className="inline-flex rounded-full bg-background p-1.5 ring-1 ring-border">
              {zeroAddress ? (
                <ZeroMark size={112} />
              ) : (
                <IdentityAvatar size={112} value={identity} />
              )}
            </span>
            {zeroAddress ? (
              <>
                <p className="mt-4 font-semibold text-lg tracking-tight">Protocol zero address</p>
                <p className="mt-1 max-w-md text-muted text-xs leading-5">
                  Qubic uses this identity as NULL_ID for special transactions such as mining
                  solutions, votes, oracle replies, and system events. A transfer here is not
                  automatically a burn.
                </p>
              </>
            ) : null}
            <p
              className="mt-4 max-w-full select-all break-all font-mono text-[11px] text-muted tracking-tight sm:text-xs"
              title={identity}
            >
              {identity}
            </p>
          </div>
        )}
        {contract ? (
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
        ) : profile || profilePending ? null : (
          <div className="mx-auto mt-8 max-w-3xl">
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
            <div className="mt-5 flex justify-center">
              <div className="flex items-center rounded-full border border-border/70 bg-background/50 p-1">
                <IdentityActions
                  identity={identity}
                  onProfileAction={() => setProfileDialogOpen(true)}
                  profileAction={profileAction}
                />
              </div>
            </div>
          </div>
        )}
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

      {contract || profileUnavailable || zeroAddress ? null : (
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
