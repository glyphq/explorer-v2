"use client";

import type { EventLike } from "@/components/explorer/event-summary";
import {
  RecordEmpty,
  RecordList,
  RecordSkeleton,
  TransactionRow,
} from "@/components/explorer/records";
import type { IdentityActivityItem, Transaction } from "@/lib/api/generated/types.gen";

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
    return <RecordSkeleton rows={6} />;
  }

  if (groups.length === 0) {
    return <RecordEmpty>No activity indexed for this account.</RecordEmpty>;
  }

  return (
    <RecordList>
      {groups.map((group, index) => (
        <TransactionRow
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
