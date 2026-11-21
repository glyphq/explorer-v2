"use client";

import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, useCallback, useState } from "react";
import { CodeSquareIcon } from "@solar-icons/react/linear/code-square";
import { PenIcon } from "@solar-icons/react/linear/pen";

import { ActionTooltip } from "@/components/explorer/action-tooltip";
import { BoxLabel } from "@/components/explorer/box-label";
import { ContractMark } from "@/components/explorer/contract-mark";
import { useContract } from "@/components/explorer/contract-provider";
import { IdentityActions } from "@/components/explorer/identity-actions";
import { IdentityAvatar } from "@/components/explorer/identity-avatar";
import { CopyableId } from "@/components/explorer/links";
import { LoadMore } from "@/components/explorer/load-more";
import { SectionHeading } from "@/components/explorer/page-header";
import { ErrorState } from "@/components/explorer/state";
import { ExchangeListingNotice } from "@/features/exchanges/exchange-logo";
import { isProfileUnavailable } from "@/features/profiles/api";
import { ProfileDialog } from "@/features/profiles/profile-dialog";
import { ProfileVerificationBadge } from "@/features/profiles/profile-badge";
import { ProfileSocialLinks } from "@/features/profiles/profile-header";
import { useProfile } from "@/features/profiles/use-profile";
import {
  pageRows,
  useIdentity,
  useIdentityTransactions,
  useLiveIdentity,
  useMarket,
} from "@/lib/api/hooks";
import { isExchangeDelisted } from "@/lib/exchanges/brands";
import { formatInteger, formatUsdValue } from "@/lib/format";
import type { PublicProfile } from "@/lib/profiles/types";
import { isZeroIdentity } from "@/lib/transactions/special-hash";

import { groupTransactionEvents } from "./activity-feed";
import { ActivityTable } from "./activity-table";

const actionClass =
  "inline-flex h-9 max-sm:h-10 items-center gap-1.5 rounded-lg bg-surface px-3 font-medium text-foreground text-xs transition-colors hover:text-accent";
const iconActionClass =
  "inline-flex size-9 max-sm:size-10 items-center justify-center rounded-lg bg-surface text-foreground transition-colors hover:text-accent";

function Stat({
  detail,
  label,
  loading,
  value,
}: {
  detail?: string;
  label: string;
  loading: boolean;
  value?: ReactNode;
}) {
  return (
    <div>
      <dt>
        <BoxLabel>{label}</BoxLabel>
      </dt>
      <dd className="rounded-lg bg-surface px-3 py-2">
        {loading ? (
          <span className="block h-6 w-24 animate-pulse rounded bg-surface-secondary" />
        ) : (
          <span className="block font-semibold text-[13px] leading-5 tracking-tight sm:text-lg sm:leading-6">
            {value}
          </span>
        )}
        {detail ? <span className="mt-0.5 block text-[10px] text-muted">{detail}</span> : null}
      </dd>
    </div>
  );
}

function QuStatValue({ value }: { value: number }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="whitespace-nowrap tabular-nums">{formatInteger(value)}</span>
      <span className="font-medium text-[0.6em] text-muted tracking-wide">QUBIC</span>
    </span>
  );
}

export function AccountDetail({
  identity,
  initialProfile,
}: {
  identity: string;
  initialProfile?: PublicProfile | null;
}) {
  const zeroAddress = isZeroIdentity(identity);
  const contract = useContract(identity);
  const identityQuery = useIdentity(identity);
  const liveIdentity = useLiveIdentity(identity);
  const profileQuery = useProfile(identity, initialProfile);
  const market = useMarket();
  const activity = useIdentityTransactions(identity, 25);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const data = identityQuery.data?.data;
  const liveData = liveIdentity.data?.data;
  const profile = profileQuery.data ?? null;
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
  const activityGroups = groupTransactionEvents(pageRows(activity.data?.pages), []);
  const hasData = Boolean(data ?? liveData);
  const loading =
    !hasData && (identityQuery.isLoading || liveIdentity.isLoading || profileQuery.isLoading);
  const failed = !(loading || hasData || profileReady);
  const balance =
    liveData?.balance ??
    (data?.balance !== undefined && data.balance >= 0 ? data.balance : undefined);
  const incoming = liveData?.incoming_amount ?? data?.incoming_amount;
  const outgoing = liveData?.outgoing_amount ?? data?.outgoing_amount;
  const price = market.data?.data.price_usd;
  const usdBalance = balance !== undefined && price !== undefined ? balance * price : undefined;
  const transferCount =
    data?.transfer_count ??
    (liveData
      ? (liveData.incoming_transfers ?? 0) + (liveData.outgoing_transfers ?? 0)
      : undefined);
  const title =
    contract?.name ?? profile?.displayName ?? (zeroAddress ? "Protocol zero address" : "Account");
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

  const stats: ReactNode[] = [];
  if (loading || balance !== undefined) {
    stats.push(
      <Stat
        detail={usdBalance === undefined ? undefined : `≈ ${formatUsdValue(usdBalance)}`}
        key="balance"
        label="Balance"
        loading={loading}
        value={balance === undefined ? undefined : <QuStatValue value={balance} />}
      />,
    );
  }
  if (loading || incoming !== undefined) {
    stats.push(
      <Stat
        key="incoming"
        label="Incoming"
        loading={loading}
        value={incoming === undefined ? undefined : <QuStatValue value={incoming} />}
      />,
    );
  }
  if (loading || outgoing !== undefined) {
    stats.push(
      <Stat
        key="outgoing"
        label="Outgoing"
        loading={loading}
        value={outgoing === undefined ? undefined : <QuStatValue value={outgoing} />}
      />,
    );
  }
  if (loading || transferCount !== undefined) {
    stats.push(
      <Stat
        key="transfers"
        label="Transfers"
        loading={loading}
        value={formatInteger(transferCount)}
      />,
    );
  }

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <header className="pb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex min-w-0 flex-wrap items-center gap-2.5 break-words font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
              <span className="flex shrink-0">
                {contract ? (
                  <ContractMark name={contract.name} size={32} />
                ) : (
                  <IdentityAvatar size={32} value={identity} />
                )}
              </span>
              <span className="min-w-0 break-words">{title}</span>
              {profile ? <ProfileVerificationBadge profile={profile} /> : null}
              {profile?.kind === "exchange" && isExchangeDelisted(profile.displayName) ? (
                <ExchangeListingNotice name={profile.displayName} />
              ) : null}
            </h1>
            <div className="mt-2 min-w-0 text-muted text-xs">
              <CopyableId value={identity} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {contract ? (
              <Link
                className={actionClass}
                href={`/contracts/${contract.name.toLowerCase()}` as Route}
              >
                <CodeSquareIcon aria-hidden className="size-3.5" />
                Contract
              </Link>
            ) : null}
            {profileAction ? (
              <ActionTooltip label={profileAction === "edit" ? "Edit profile" : "Claim profile"}>
                <button
                  aria-label={profileAction === "edit" ? "Edit profile" : "Claim profile"}
                  className={iconActionClass}
                  onClick={() => setProfileDialogOpen(true)}
                  type="button"
                >
                  <PenIcon aria-hidden className="size-4" />
                </button>
              </ActionTooltip>
            ) : null}
            <div className="rounded-lg bg-surface p-0.5">
              <IdentityActions identity={identity} showCopy={false} />
            </div>
          </div>
        </div>

        {profile?.bio ? (
          <p className="mt-4 max-w-2xl whitespace-pre-line break-words text-pretty text-foreground/80 text-sm leading-relaxed">
            {profile.bio}
          </p>
        ) : null}

        {profile ? <ProfileSocialLinks align="start" className="mt-4" profile={profile} /> : null}

        {stats.length === 0 ? null : (
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            {stats}
          </dl>
        )}
      </header>

      <section className="py-6">
        <SectionHeading title="Activity" />
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
