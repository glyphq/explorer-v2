"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, useId, useState } from "react";

import { ActorLabel } from "@/components/explorer/actor-label";
import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import { useTransactionContract } from "@/components/explorer/contract-provider";
import { TransactionEvents } from "@/components/explorer/transaction-events";
import { transactionTarget } from "@/components/explorer/transaction-target";
import type { ActivityGroup } from "@/features/accounts/activity-feed";
import { formatQu, formatTimestamp, formatTimestampCompact } from "@/lib/format";
import { parseSpecialHash } from "@/lib/transactions/special-hash";

function TickActivityRow({ group }: { group: ActivityGroup }) {
  const { events, transaction } = group;
  const target = transactionTarget(transaction.hash);
  const call = useTransactionContract(transaction);
  const eventsId = useId();
  const [eventsOpen, setEventsOpen] = useState(false);
  const special = parseSpecialHash(transaction.hash);
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
        interactive={false}
      >
        <td className="px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center">
              {events.length > 0 ? (
                <button
                  aria-controls={eventsId}
                  aria-expanded={eventsOpen}
                  aria-label={eventsOpen ? "Hide events" : "Show events"}
                  className="inline-flex size-4 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="min-w-0 truncate font-mono text-foreground text-xs transition-colors hover:text-accent"
                href={target.href}
                title={target.title}
              >
                {target.label}
              </Link>
            ) : (
              <span className="text-muted text-xs">—</span>
            )}
            {failed ? (
              <span className="shrink-0 text-danger text-xs">{transaction.status}</span>
            ) : null}
          </div>
        </td>
        <td className="px-3 py-3">
          <span className="block max-w-48 truncate text-foreground text-xs" title={typeLabel}>
            {typeLabel}
          </span>
        </td>
        <td className="px-3 py-3 text-right">
          {transaction.timestamp ? (
            <time
              className="whitespace-nowrap text-foreground text-xs tabular-nums"
              dateTime={transaction.timestamp}
              title={formatTimestamp(transaction.timestamp)}
            >
              {formatTimestampCompact(transaction.timestamp)}
            </time>
          ) : (
            <span className="text-muted text-xs">—</span>
          )}
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
      </ActivityTableRow>
      {events.length > 0 && eventsOpen ? (
        <tr id={eventsId}>
          <td className="bg-surface-secondary/40 p-0" colSpan={6}>
            <div className="pt-1">
              <TransactionEvents events={events} source={transaction.source} />
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-28", header: "Tx ID", width: "w-[20%]" },
  { barClassName: "w-20", header: "Tx type", width: "w-[18%]" },
  {
    align: "right",
    barClassName: "w-24",
    header: "Timestamp",
    width: "w-[16%]",
  },
  { barClassName: "w-24", header: "Source", width: "w-[16%]" },
  { barClassName: "w-24", header: "Destination", width: "w-[16%]" },
  { align: "right", barClassName: "w-12", header: "Amount", width: "w-[14%]" },
];

function TickActivityTable({
  groups,
  isLoading,
}: {
  groups: ActivityGroup[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <ActivityTableSkeleton
        columns={SKELETON_COLUMNS}
        label="Loading tick activity"
        minWidth="min-w-[1040px]"
        rows={8}
      />
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-[4px] bg-surface py-10 text-center text-muted text-sm">
        No activity in this tick.
      </div>
    );
  }

  return (
    <ActivityTable label="Tick activity" minWidth="min-w-[1040px]">
      <ActivityTableHead>
        <th className="w-[20%] px-4 py-3 font-normal">Tx ID</th>
        <th className="w-[18%] px-3 py-3 font-normal">Tx type</th>
        <th className="w-[16%] px-3 py-3 text-right font-normal">Timestamp</th>
        <th className="w-[16%] px-3 py-3 font-normal">Source</th>
        <th className="w-[16%] px-3 py-3 font-normal">Destination</th>
        <th className="w-[14%] px-3 py-3 text-right font-normal">Amount</th>
      </ActivityTableHead>
      <tbody>
        {groups.map((group, index) => (
          <TickActivityRow group={group} key={`${group.transaction.hash ?? "activity"}-${index}`} />
        ))}
      </tbody>
    </ActivityTable>
  );
}

export { TickActivityTable };
