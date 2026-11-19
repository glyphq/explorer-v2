"use client";

import { ArrowDownIcon } from "@solar-icons/react/linear/arrow-down";
import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";
import { ArrowUpIcon } from "@solar-icons/react/linear/arrow-up";
import type { ReactNode } from "react";

import type { Asset, Epoch, Identity, Tick, Transaction } from "@/lib/api/generated/types.gen";
import { formatInteger, formatQu, formatRelativeTime, formatTimestamp } from "@/lib/format";
import type { EventLike } from "./event-summary";
import { EventSummary } from "./event-summary";
import { IdentityAvatar } from "./identity-avatar";
import { IdentityLink, TickLink, TransactionLink } from "./links";

export function RecordList({ children }: { children: ReactNode }) {
  return <ul className="space-y-0.5">{children}</ul>;
}

export function RecordRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={`rounded-xl px-3 py-3.5 transition-colors hover:bg-surface-secondary sm:px-4 ${className}`}
    >
      {children}
    </li>
  );
}

export function RecordSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="flex items-center gap-3 px-3 py-4" key={index}>
          <div className="size-7 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-pulse rounded bg-surface-secondary" />
            <div className="h-2.5 w-3/5 animate-pulse rounded bg-surface-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

function relative(value: string | undefined) {
  return <span title={formatTimestamp(value)}>{formatRelativeTime(value)}</span>;
}

export function TransactionRow({
  currentIdentity,
  events,
  showTick = true,
  transaction,
}: {
  currentIdentity?: string;
  events?: EventLike[];
  showTick?: boolean;
  transaction: Transaction;
}) {
  const isTransfer = (transaction.input_type ?? 0) === 0;
  const outgoing = isTransfer && currentIdentity && transaction.source === currentIdentity;
  const incoming = isTransfer && currentIdentity && transaction.destination === currentIdentity;
  const DirectionIcon = outgoing ? ArrowUpIcon : incoming ? ArrowDownIcon : ArrowRightIcon;
  const directionLabel = isTransfer
    ? outgoing
      ? "Sent to"
      : incoming
        ? "Received from"
        : null
    : currentIdentity
      ? "Called"
      : null;
  const counterparty = isTransfer
    ? outgoing
      ? transaction.destination
      : incoming
        ? transaction.source
        : null
    : transaction.destination;

  return (
    <RecordRow>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-muted">
          <DirectionIcon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1">
              {isTransfer ? (
                <span className="tabular font-semibold text-foreground text-sm">
                  {formatQu(transaction.amount)}
                </span>
              ) : (
                <span className="font-medium text-foreground text-sm">Contract call</span>
              )}
              {directionLabel && counterparty ? (
                <>
                  <span className="text-muted text-xs">{directionLabel}</span>
                  <IdentityLink avatar identity={counterparty} />
                </>
              ) : null}
              {!isTransfer && transaction.amount !== undefined && transaction.amount > 0 ? (
                <span className="tabular text-muted text-xs">{formatQu(transaction.amount)}</span>
              ) : null}
              {transaction.status && transaction.status !== "success" ? (
                <span className="text-[10px] text-danger">{transaction.status}</span>
              ) : null}
            </p>
            <span className="shrink-0 text-[11px] text-muted">
              {relative(transaction.timestamp)}
            </span>
          </div>

          {directionLabel ? null : (
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
              <IdentityLink avatar identity={transaction.source ?? ""} />
              <ArrowRightIcon className="size-3 shrink-0 text-muted" />
              <IdentityLink avatar identity={transaction.destination ?? ""} />
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
            <TransactionLink hash={transaction.hash ?? ""} />
            {showTick ? (
              <span className="inline-flex items-center gap-1">
                tick <TickLink tick={transaction.tick} />
              </span>
            ) : null}
          </div>

          {events && events.length > 0 ? (
            <div className="mt-2.5 space-y-2 rounded-lg bg-surface-secondary/60 p-2.5">
              {events.map((event, index) => (
                <EventSummary compact event={event} key={`${event.log_id ?? "event"}-${index}`} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </RecordRow>
  );
}

export function AccountRow({ identity }: { identity: Identity }) {
  const value = identity.identity ?? "";
  const net = (identity.incoming_amount ?? 0) - (identity.outgoing_amount ?? 0);

  return (
    <RecordRow>
      <div className="flex items-center gap-3">
        <IdentityAvatar size={30} value={value} />
        <div className="min-w-0 flex-1">
          <IdentityLink identity={value} />
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            <span>{formatInteger(identity.transfer_count)} transfers</span>
            <span className="inline-flex items-center gap-1">
              last seen <TickLink tick={identity.last_seen_tick} />
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular font-medium text-foreground text-sm">
            {formatQu(identity.balance)}
          </p>
          <p className="tabular mt-0.5 text-[10px] text-muted">
            {net > 0 ? "+" : ""}
            {formatQu(net)} net
          </p>
        </div>
      </div>
    </RecordRow>
  );
}

export function TickRow({ tick }: { tick: Tick }) {
  return (
    <RecordRow>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <TickLink className="font-semibold text-sm" tick={tick.tick} />
            <span className="text-[10px] text-muted">epoch {formatInteger(tick.epoch)}</span>
            {tick.verification ? (
              <span className="text-[10px] text-muted">{tick.verification}</span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            <span>{formatInteger(tick.transaction_count)} transactions</span>
            <span>{formatInteger(tick.event_count)} events</span>
            <span>computor {formatInteger(tick.computor_index)}</span>
          </div>
        </div>
        <span className="shrink-0 text-[10px] text-muted">{relative(tick.timestamp)}</span>
      </div>
    </RecordRow>
  );
}

export function EpochRow({ epoch }: { epoch: Epoch }) {
  return (
    <RecordRow>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tabular font-semibold text-foreground text-sm">
              Epoch {formatInteger(epoch.epoch)}
            </span>
            <span className="text-[10px] text-muted">{epoch.closed ? "closed" : "open"}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            <span>
              <TickLink tick={epoch.first_tick} /> to <TickLink tick={epoch.last_tick} />
            </span>
            <span>{formatInteger(epoch.tick_count)} ticks</span>
            <span>{formatInteger(epoch.transaction_count)} transactions</span>
            <span>{formatInteger(epoch.event_count)} events</span>
          </div>
        </div>
        <span className="shrink-0 text-[10px] text-muted">{relative(epoch.last_timestamp)}</span>
      </div>
    </RecordRow>
  );
}

export function AssetRow({ asset }: { asset: Asset }) {
  return (
    <RecordRow>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">{asset.name ?? "Unnamed asset"}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              issuer <IdentityLink identity={asset.issuer ?? ""} />
            </span>
            {asset.unit ? <span>{asset.unit}</span> : null}
            <span>{formatInteger(asset.decimals)} decimals</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular font-medium text-foreground text-sm">
            {formatInteger(asset.shares)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">shares</p>
        </div>
      </div>
    </RecordRow>
  );
}

export function RecordEmpty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-16 text-center text-muted text-sm">{children}</p>;
}
