"use client";

import { useQueries } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, useId, useMemo, useState } from "react";

import { ActorLabel } from "@/components/explorer/actor-label";
import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import { parseEventBody } from "@/components/explorer/event-summary";
import { useTransactionContract } from "@/components/explorer/contract-provider";
import { transactionTarget } from "@/components/explorer/transaction-target";
import type { Event, Transaction } from "@/lib/api/generated/types.gen";
import { listTickEventsOptions } from "@/lib/api/generated/@tanstack/react-query.gen";
import { formatInteger, formatQu, formatTimestamp, formatTimestampCompact } from "@/lib/format";
import { decodeCustomMessage } from "@/lib/transactions/special";
import { parseSpecialHash } from "@/lib/transactions/special-hash";

const EVENT_LABELS: Record<string, string> = {
  asset_ownership_change: "Asset ownership",
  asset_possession_change: "Asset possession",
  burning: "Burn",
  contract_debug: "Contract debug",
  contract_error: "Contract error",
  contract_information: "Contract info",
  contract_warning: "Contract warning",
  custom_message: "Custom message",
  qu_transfer: "QU transfer",
};

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function EventLine({ event, source }: { event: Event; source?: string }) {
  const body = parseEventBody(event.body);
  const custom = decodeCustomMessage(textValue(body?.raw));
  const status = custom?.status;
  const label =
    custom?.label ??
    EVENT_LABELS[event.type_name ?? ""] ??
    (event.type_name || "event").replaceAll("_", " ");
  const amount = numberValue(body?.amount);
  const from = textValue(body?.from) ?? source;
  const to = textValue(body?.to);
  const statusTone = status?.tone === "danger" ? "text-danger" : "text-muted";
  const isTransfer = event.type_name === "qu_transfer";
  const amountLabel =
    amount !== undefined ? (
      <span className="whitespace-nowrap font-medium text-foreground tabular-nums">
        {formatQu(amount)}
      </span>
    ) : null;

  return (
    <li>
      <p className="text-muted text-xs leading-5">
        {isTransfer ? (
          <>
            Transferred {amountLabel ?? <span className="font-medium text-foreground">QU</span>}
            {from ? (
              <>
                {" "}
                from <ActorLabel identity={from} showAvatar={false} />
              </>
            ) : null}
            {to ? (
              <>
                {" "}
                to <ActorLabel identity={to} showAvatar={false} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{label}</span>
            {status && status.tone !== "success" ? (
              <span className={`font-medium text-[9px] ${statusTone}`}> ({status.label})</span>
            ) : null}
            {amountLabel ? <> · {amountLabel}</> : null}
            {from ? (
              <>
                {" "}
                from <ActorLabel identity={from} showAvatar={false} />
              </>
            ) : null}
            {to ? (
              <>
                {" "}
                to <ActorLabel identity={to} showAvatar={false} />
              </>
            ) : null}
          </>
        )}
      </p>
    </li>
  );
}

function TransactionEvents({ events, source }: { events: Event[]; source?: string }) {
  return (
    <div className="px-4 pb-3">
      <ul className="ml-6 space-y-2">
        {events.map((event, index) => (
          <EventLine
            event={event}
            key={`${event.log_id ?? event.tx_hash ?? "event"}-${event.tx_index ?? index}`}
            source={source}
          />
        ))}
      </ul>
    </div>
  );
}

function TransactionRow({ events, transaction }: { events: Event[]; transaction: Transaction }) {
  const target = transactionTarget(transaction.hash);
  const special = parseSpecialHash(transaction.hash);
  const call = useTransactionContract(transaction);
  const eventsId = useId();
  const [eventsOpen, setEventsOpen] = useState(false);
  const isTransfer = call.kind === "transfer";
  const typeLabel = special
    ? "System event"
    : call.kind === "special"
      ? (call.special?.label ?? "System transaction")
      : isTransfer
        ? "Transfer"
        : (call.procedure?.name ?? "Contract call");
  const failed = transaction.status && transaction.status !== "success";
  const showAmount =
    transaction.amount !== undefined &&
    transaction.amount !== null &&
    (isTransfer || transaction.amount > 0);

  return (
    <Fragment>
      <ActivityTableRow
        className={eventsOpen ? "bg-surface-secondary/40" : ""}
        hover={!eventsOpen}
        interactive={Boolean(target)}
      >
        <td className="px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center">
              {events.length > 0 ? (
                <button
                  aria-controls={eventsId}
                  aria-expanded={eventsOpen}
                  aria-label={eventsOpen ? "Hide events" : "Show events"}
                  className="relative z-10 inline-flex size-4 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setEventsOpen((open) => !open)}
                  type="button"
                >
                  <ChevronRight
                    className={`size-3 transition-transform duration-200 ${
                      eventsOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>
              ) : null}
            </span>
            {target ? (
              <Link
                className="min-w-0 truncate font-mono text-foreground text-xs transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
                href={target.href}
                title={target.title}
              >
                {target.label}
              </Link>
            ) : (
              <span className="text-muted text-xs">—</span>
            )}
            {failed ? (
              <span className="shrink-0 text-[10px] text-danger">{transaction.status}</span>
            ) : null}
          </div>
        </td>
        <td className="px-3 py-3">
          <span
            className={`block max-w-48 truncate text-xs ${
              isTransfer ? "text-muted" : "font-medium text-foreground"
            }`}
            title={typeLabel}
          >
            {typeLabel}
          </span>
        </td>
        <td className="px-3 py-3">
          <ActorLabel identity={transaction.source} />
        </td>
        <td className="px-3 py-3">
          <ActorLabel identity={transaction.destination} />
        </td>
        <td className="px-3 py-3 text-right text-xs tabular-nums">
          {showAmount ? (
            <span
              className={`whitespace-nowrap ${
                isTransfer ? "font-medium text-foreground" : "text-muted"
              }`}
            >
              {formatQu(transaction.amount)}
            </span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-right text-muted text-xs tabular-nums">
          {formatInteger(transaction.tick)}
        </td>
        <td className="px-4 py-3 text-right text-[10px] text-muted">
          <time dateTime={transaction.timestamp} title={formatTimestamp(transaction.timestamp)}>
            {formatTimestampCompact(transaction.timestamp)}
          </time>
        </td>
      </ActivityTableRow>
      {events.length > 0 && eventsOpen ? (
        <tr id={eventsId}>
          <td className="bg-surface-secondary/40 p-0" colSpan={7}>
            <div className="px-4 pb-3">
              <TransactionEvents events={events} source={transaction.source} />
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const tickNumbers = useMemo(() => {
    const ticks = new Set<number>();
    for (const transaction of transactions) {
      if (Number.isInteger(transaction.tick) && (transaction.tick ?? 0) > 0) {
        ticks.add(transaction.tick!);
      }
    }
    return [...ticks];
  }, [transactions]);

  const tickEventOptions = useMemo(
    () =>
      tickNumbers.map((tick) => ({
        ...listTickEventsOptions({ path: { tick }, query: { limit: 1000 } }),
        enabled: tick > 0,
      })),
    [tickNumbers],
  );

  const tickEventQueries = useQueries({ queries: tickEventOptions });

  const eventsByHash = useMemo(() => {
    const byHash = new Map<string, Event[]>();

    for (const query of tickEventQueries) {
      for (const event of query.data?.data ?? []) {
        if (!event.tx_hash) {
          continue;
        }
        const key = event.tx_hash.toLowerCase();
        const bucket = byHash.get(key);
        if (bucket) {
          bucket.push(event);
        } else {
          byHash.set(key, [event]);
        }
      }
    }

    return byHash;
  }, [tickEventQueries]);

  return (
    <ActivityTable label="Transactions" minWidth="min-w-[1080px]">
      <ActivityTableHead>
        <th className="w-[18%] px-4 py-3 font-normal">Hash</th>
        <th className="w-[15%] px-3 py-3 font-normal">Type</th>
        <th className="w-[15%] px-3 py-3 font-normal">From</th>
        <th className="w-[15%] px-3 py-3 font-normal">To</th>
        <th className="w-[12%] px-3 py-3 text-right font-normal">Amount</th>
        <th className="w-[9%] px-3 py-3 text-right font-normal">Tick</th>
        <th className="w-[16%] px-4 py-3 text-right font-normal">Observed</th>
      </ActivityTableHead>
      <tbody>
        {transactions.map((transaction) => {
          const key = transaction.hash ?? `${transaction.tick}-${transaction.tx_index}`;
          const events = transaction.hash
            ? (eventsByHash.get(transaction.hash.toLowerCase()) ?? [])
            : [];

          return <TransactionRow events={events} key={key} transaction={transaction} />;
        })}
      </tbody>
    </ActivityTable>
  );
}

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-28", header: "Hash", width: "w-[18%]" },
  { barClassName: "w-20", header: "Type", width: "w-[15%]" },
  { barClassName: "w-24", header: "From", width: "w-[15%]" },
  { barClassName: "w-24", header: "To", width: "w-[15%]" },
  { align: "right", barClassName: "w-12", header: "Amount", width: "w-[12%]" },
  { align: "right", barClassName: "w-10", header: "Tick", width: "w-[9%]" },
  { align: "right", barClassName: "w-24", header: "Observed", width: "w-[16%]" },
];

function TransactionTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <ActivityTableSkeleton
      columns={SKELETON_COLUMNS}
      label="Loading transactions"
      minWidth="min-w-[1080px]"
      rows={rows}
    />
  );
}

export { TransactionTable, TransactionTableSkeleton };
