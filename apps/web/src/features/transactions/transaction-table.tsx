"use client";

import { useQueries } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, useId, useMemo, useState } from "react";

import { ActorLabel } from "@/components/explorer/actor-label";
import { parseEventBody } from "@/components/explorer/event-summary";
import { useTransactionContract } from "@/components/explorer/contract-provider";
import { transactionTarget } from "@/components/explorer/transaction-target";
import type { Event, Transaction } from "@/lib/api/generated/types.gen";
import { listTickEventsOptions } from "@/lib/api/generated/@tanstack/react-query.gen";
import {
  formatInteger,
  formatQu,
  formatTime,
  formatTimestamp,
  formatTimestampCompact,
} from "@/lib/format";
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
    <div className="bg-surface-secondary/40 px-2 pb-3 sm:px-4">
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
      <tr
        className={`group relative transition-colors ${
          target ? "cursor-pointer" : ""
        } ${eventsOpen ? "bg-surface-secondary/40" : "hover:bg-surface-secondary"}`}
      >
        <td className="px-2 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center">
              {events.length > 0 ? (
                <button
                  aria-controls={eventsId}
                  aria-expanded={eventsOpen}
                  aria-label={eventsOpen ? "Hide events" : "Show events"}
                  className="relative z-10 inline-flex size-4 items-center justify-center rounded-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted md:hidden">
            <span className="min-w-0 truncate">{typeLabel}</span>
            <span className="inline-flex min-w-0 flex-wrap items-center gap-1">
              <ActorLabel identity={transaction.source} />→
              <ActorLabel identity={transaction.destination} />
            </span>
            <span>tick {formatInteger(transaction.tick)}</span>
          </div>
          <div className="mt-1 hidden flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted md:flex xl:hidden">
            <span className="inline-flex min-w-0 flex-wrap items-center gap-1">
              <ActorLabel identity={transaction.source} />→
              <ActorLabel identity={transaction.destination} />
            </span>
          </div>
        </td>
        <td className="hidden px-3 py-3 md:table-cell">
          <span
            className={`block max-w-48 truncate text-xs ${
              isTransfer ? "text-muted" : "font-medium text-foreground"
            }`}
            title={typeLabel}
          >
            {typeLabel}
          </span>
        </td>
        <td className="hidden px-3 py-3 xl:table-cell">
          <ActorLabel identity={transaction.source} />
        </td>
        <td className="hidden px-3 py-3 xl:table-cell">
          <ActorLabel identity={transaction.destination} />
        </td>
        <td className="px-2 py-3 text-right text-xs tabular-nums sm:px-3">
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
        <td className="hidden px-3 py-3 text-right text-muted text-xs tabular-nums md:table-cell">
          {formatInteger(transaction.tick)}
        </td>
        <td className="px-2 py-3 text-right text-[10px] text-muted sm:px-4">
          <time dateTime={transaction.timestamp} title={formatTimestamp(transaction.timestamp)}>
            <span className="md:hidden">{formatTime(transaction.timestamp)}</span>
            <span className="hidden md:inline">
              {formatTimestampCompact(transaction.timestamp)}
            </span>
          </time>
        </td>
      </tr>
      {events.length > 0 && eventsOpen ? (
        <tr id={eventsId}>
          <td className="p-0" colSpan={7}>
            <div className="px-2 pb-3 sm:px-4">
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
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-[10px] text-muted uppercase tracking-[0.14em]">
              <th className="w-[52%] px-2 py-3 font-normal sm:px-4 md:w-[28%] xl:w-[20%]">Hash</th>
              <th className="hidden px-3 py-3 font-normal md:table-cell md:w-[22%] xl:w-[15%]">
                Type
              </th>
              <th className="hidden px-3 py-3 font-normal xl:table-cell xl:w-[13%]">From</th>
              <th className="hidden px-3 py-3 font-normal xl:table-cell xl:w-[13%]">To</th>
              <th className="w-[26%] px-2 py-3 text-right font-normal sm:px-3 md:w-[18%] xl:w-[12%]">
                Amount
              </th>
              <th className="hidden px-3 py-3 text-right font-normal md:table-cell md:w-[13%] xl:w-[10%]">
                Tick
              </th>
              <th className="w-[22%] px-2 py-3 text-right font-normal sm:px-4 md:w-[19%] xl:w-[17%]">
                Observed
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const key = transaction.hash ?? `${transaction.tick}-${transaction.tx_index}`;
              const events = transaction.hash
                ? (eventsByHash.get(transaction.hash.toLowerCase()) ?? [])
                : [];

              return <TransactionRow events={events} key={key} transaction={transaction} />;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="overflow-x-auto">
        <table
          aria-label="Loading transactions"
          className="w-full table-fixed border-separate border-spacing-0 text-left"
        >
          <thead>
            <tr className="text-[10px] text-muted uppercase tracking-[0.14em]">
              <th className="w-[52%] px-2 py-3 font-normal sm:px-4 md:w-[28%] xl:w-[20%]">Hash</th>
              <th className="hidden px-3 py-3 font-normal md:table-cell md:w-[22%] xl:w-[15%]">
                Type
              </th>
              <th className="hidden px-3 py-3 font-normal xl:table-cell xl:w-[13%]">From</th>
              <th className="hidden px-3 py-3 font-normal xl:table-cell xl:w-[13%]">To</th>
              <th className="w-[26%] px-2 py-3 text-right font-normal sm:px-3 md:w-[18%] xl:w-[12%]">
                Amount
              </th>
              <th className="hidden px-3 py-3 text-right font-normal md:table-cell md:w-[13%] xl:w-[10%]">
                Tick
              </th>
              <th className="w-[22%] px-2 py-3 text-right font-normal sm:px-4 md:w-[19%] xl:w-[17%]">
                Observed
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index}>
                <td className="px-2 py-3 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-4 shrink-0" />
                    <span className="h-3 w-32 animate-pulse rounded bg-surface-secondary sm:w-40" />
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5 md:hidden">
                    <span className="h-2 w-16 animate-pulse rounded bg-surface-secondary" />
                    <span className="h-2 w-32 animate-pulse rounded bg-surface-secondary" />
                    <span className="h-2 w-20 animate-pulse rounded bg-surface-secondary" />
                  </div>
                  <div className="mt-2 hidden items-center gap-1.5 md:flex xl:hidden">
                    <span className="size-4 animate-pulse rounded-full bg-surface-secondary" />
                    <span className="h-2 w-24 animate-pulse rounded bg-surface-secondary" />
                  </div>
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <span className="block h-3 w-20 animate-pulse rounded bg-surface-secondary" />
                </td>
                <td className="hidden px-3 py-3 xl:table-cell">
                  <div className="flex items-center gap-1.5">
                    <span className="size-4 animate-pulse rounded-full bg-surface-secondary" />
                    <span className="h-3 w-24 animate-pulse rounded bg-surface-secondary" />
                  </div>
                </td>
                <td className="hidden px-3 py-3 xl:table-cell">
                  <div className="flex items-center gap-1.5">
                    <span className="size-4 animate-pulse rounded-full bg-surface-secondary" />
                    <span className="h-3 w-24 animate-pulse rounded bg-surface-secondary" />
                  </div>
                </td>
                <td className="px-2 py-3 sm:px-3">
                  <span className="ml-auto block h-3 w-14 animate-pulse rounded bg-surface-secondary" />
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <span className="ml-auto block h-3 w-14 animate-pulse rounded bg-surface-secondary" />
                </td>
                <td className="px-2 py-3 sm:px-4">
                  <span className="ml-auto block h-3 w-16 animate-pulse rounded bg-surface-secondary" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { TransactionTable, TransactionTableSkeleton };
