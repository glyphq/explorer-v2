"use client";

import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { type ReactNode, useId, useState } from "react";

import { useTransactionContract } from "@/components/explorer/contract-provider";
import { EventSummary, type EventLike } from "@/components/explorer/event-summary";
import { IdentityLink, TickLink, TransactionLink } from "@/components/explorer/links";
import { RecordEmpty, RecordList } from "@/components/explorer/records";
import type { IdentityActivityItem, Transaction } from "@/lib/api/generated/types.gen";
import { classNames, formatQu, formatRelativeTime, formatTimestamp } from "@/lib/format";

export type ActivityGroup = {
  events: EventLike[];
  transaction: Transaction;
};

function normalizeActivityItem(item: IdentityActivityItem): {
  event?: EventLike;
  transaction?: Transaction;
} {
  const raw = item as IdentityActivityItem & Record<string, unknown>;
  if (item.kind === "transaction") {
    return { transaction: (item.transaction ?? raw) as Transaction };
  }
  return { event: (item.event ?? raw) as EventLike };
}

function syntheticTransaction(event: EventLike, item: IdentityActivityItem): Transaction {
  return {
    amount: event.amount,
    destination: event.destination,
    hash: event.tx_hash ?? event.hash,
    source: event.source,
    tick: event.tick ?? item.tick,
    timestamp: event.timestamp ?? item.timestamp,
  };
}

export function groupActivity(items: IdentityActivityItem[]): ActivityGroup[] {
  const groups = new Map<
    string,
    {
      eventKeys: Set<string>;
      events: EventLike[];
      fallback?: { event: EventLike; item: IdentityActivityItem };
      order: number;
      transaction?: Transaction;
    }
  >();

  items.forEach((item, index) => {
    const { event, transaction } = normalizeActivityItem(item);
    const hash = transaction?.hash ?? event?.tx_hash ?? event?.hash ?? event?.log_id;
    const key = String(hash ?? `activity-${index}`);
    let group = groups.get(key);
    if (!group) {
      group = {
        eventKeys: new Set(),
        events: [],
        order: index,
        transaction,
      };
      groups.set(key, group);
    }
    group.transaction ??= transaction;
    if (event) {
      const eventKey = String(event.log_id ?? `${key}-${group.events.length}`);
      if (!group.eventKeys.has(eventKey)) {
        group.eventKeys.add(eventKey);
        group.events.push(event);
      }
      group.fallback ??= { event, item };
    }
  });

  return [...groups.values()]
    .sort((left, right) => left.order - right.order)
    .map((group) => ({
      events: group.events,
      transaction:
        group.transaction ??
        syntheticTransaction(
          group.fallback?.event ?? {},
          group.fallback?.item ?? { kind: "event" },
        ),
    }));
}

export function groupTransactionEvents(
  transactions: Transaction[],
  events: EventLike[],
): ActivityGroup[] {
  const groups = new Map<
    string,
    {
      eventKeys: Set<string>;
      events: EventLike[];
      order: number;
      transaction: Transaction;
    }
  >();

  transactions.forEach((transaction, index) => {
    const key = transaction.hash ?? `transaction-${index}`;
    if (!groups.has(key)) {
      groups.set(key, {
        eventKeys: new Set(),
        events: [],
        order: index,
        transaction,
      });
    }
  });

  events.forEach((event, index) => {
    const key = event.tx_hash ?? event.hash ?? `event-${transactions.length + index}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        eventKeys: new Set(),
        events: [],
        order: transactions.length + index,
        transaction: syntheticTransaction(event, { kind: "event" }),
      };
      groups.set(key, group);
    }
    const eventKey = String(event.log_id ?? `${key}-${group.events.length}`);
    if (!group.eventKeys.has(eventKey)) {
      group.eventKeys.add(eventKey);
      group.events.push(event);
    }
  });

  return [...groups.values()]
    .sort((left, right) => left.order - right.order)
    .map((group) => ({
      events: group.events,
      transaction: group.transaction,
    }));
}

export function ActivityFeed({
  groups,
  identity,
  isLoading,
  showTick = true,
}: {
  groups: ActivityGroup[];
  identity?: string;
  isLoading?: boolean;
  showTick?: boolean;
}) {
  if (isLoading) {
    return <ActivitySkeleton />;
  }

  if (groups.length === 0) {
    return <RecordEmpty>No activity yet.</RecordEmpty>;
  }

  return (
    <RecordList>
      {groups.map((group, index) => (
        <ActivityRow
          currentIdentity={identity}
          events={group.events}
          key={`${group.transaction.hash ?? "activity"}-${index}`}
          showTick={showTick}
          transaction={group.transaction}
        />
      ))}
    </RecordList>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="rounded-xl px-3 py-3.5 sm:px-4" key={index}>
          <div className="h-3 w-3/5 rounded bg-surface-secondary/70" />
          <div className="mt-2 h-2.5 w-2/5 rounded bg-surface-secondary/50" />
        </div>
      ))}
    </div>
  );
}

function ActivityRow({
  currentIdentity,
  events,
  showTick,
  transaction,
}: {
  currentIdentity?: string;
  events: EventLike[];
  showTick: boolean;
  transaction: Transaction;
}) {
  const [open, setOpen] = useState(false);
  const call = useTransactionContract(transaction);
  const detailsId = useId();
  const isTransfer = (transaction.input_type ?? 0) === 0;
  const outgoing = isTransfer && currentIdentity && transaction.source === currentIdentity;
  const incoming = isTransfer && currentIdentity && transaction.destination === currentIdentity;
  const amount = formatQu(transaction.amount);
  const hasKnownAmount =
    transaction.amount !== undefined &&
    transaction.amount !== null &&
    Number.isFinite(transaction.amount);
  const hasAmount = (transaction.amount ?? 0) > 0;
  const source = transaction.source ?? "";
  const destination = transaction.destination ?? "";
  const hash = transaction.hash ?? "";
  const failed = transaction.status !== undefined && transaction.status !== "success";

  let sentence: ReactNode;
  if (isTransfer) {
    if (outgoing && destination) {
      sentence = (
        <>
          Sent{" "}
          {hasKnownAmount ? <span className="font-medium text-foreground">{amount} </span> : null}
          to <IdentityLink className="whitespace-nowrap" identity={destination} />
        </>
      );
    } else if (incoming && source) {
      sentence = (
        <>
          Received{" "}
          {hasKnownAmount ? <span className="font-medium text-foreground">{amount} </span> : null}
          from <IdentityLink className="whitespace-nowrap" identity={source} />
        </>
      );
    } else if (source && destination) {
      sentence = (
        <>
          <IdentityLink className="whitespace-nowrap" identity={source} /> sent{" "}
          {hasKnownAmount ? <span className="font-medium text-foreground">{amount} </span> : null}
          to <IdentityLink className="whitespace-nowrap" identity={destination} />
        </>
      );
    } else {
      sentence = (
        <>
          Moved <span className="font-medium text-foreground">{amount}</span>
        </>
      );
    }
  } else if (currentIdentity && destination) {
    sentence = (
      <>
        Called{" "}
        <span className="font-medium text-foreground">{call.procedure?.name ?? "contract"}</span> on{" "}
        <IdentityLink className="whitespace-nowrap" identity={destination} />
        {hasAmount ? (
          <>
            {" "}
            with <span className="font-medium text-foreground">{amount}</span>
          </>
        ) : null}
      </>
    );
  } else if (source && destination) {
    sentence = (
      <>
        <IdentityLink className="whitespace-nowrap" identity={source} /> called{" "}
        <span className="font-medium text-foreground">{call.procedure?.name ?? "contract"}</span> on{" "}
        <IdentityLink className="whitespace-nowrap" identity={destination} />
        {hasAmount ? (
          <>
            {" "}
            with <span className="font-medium text-foreground">{amount}</span>
          </>
        ) : null}
      </>
    );
  } else {
    sentence = <>Contract call</>;
  }

  return (
    <li
      className={classNames(
        "rounded-xl transition-colors",
        open ? "bg-surface-secondary/40" : "hover:bg-surface-secondary/50",
      )}
    >
      <div className="flex items-start gap-2 px-3 py-3.5 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted text-sm leading-6">{sentence}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span title={formatTimestamp(transaction.timestamp)}>
              {formatRelativeTime(transaction.timestamp)}
            </span>
            {events.length > 0 ? (
              <span>
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            ) : null}
            {failed ? <span className="text-danger">{transaction.status}</span> : null}
          </p>
        </div>
        <button
          aria-controls={detailsId}
          aria-expanded={open}
          aria-label={open ? "Hide details" : "Show details"}
          className="mt-0.5 flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <AltArrowDownIcon
            className={classNames("size-4 transition-transform", open && "rotate-180")}
          />
          <span className="hidden sm:inline">{open ? "Hide" : "Details"}</span>
        </button>
      </div>

      {open ? (
        <div className="px-3 pb-3.5 sm:px-4" id={detailsId}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 text-[11px]">
            {hash ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-muted">Transaction</span>
                <TransactionLink hash={hash} />
              </span>
            ) : null}
            {showTick && transaction.tick !== undefined ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-muted">Tick</span>
                <TickLink tick={transaction.tick} />
              </span>
            ) : null}
          </div>

          {events.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {events.map((event, index) => (
                <EventSummary compact event={event} key={`${event.log_id ?? "event"}-${index}`} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted text-xs">No events attached.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
