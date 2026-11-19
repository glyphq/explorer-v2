"use client";

import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";

import type { Transaction } from "@/lib/api/generated/types.gen";
import { formatQu, formatRelativeTime } from "@/lib/format";

import { IdentityLink, TickLink, TransactionLink } from "./links";

const SKELETON_ROWS = 6;

function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <li className="group min-h-[58px] overflow-hidden rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-secondary">
      <div className="flex items-baseline justify-between gap-3">
        <p className="tabular truncate font-mono font-semibold text-sm">
          {formatQu(transaction.amount)}
        </p>
        <span className="shrink-0 text-[10px] text-muted">
          {formatRelativeTime(transaction.timestamp)}
        </span>
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
        <IdentityLink avatar className="max-sm:truncate" identity={transaction.source ?? ""} />
        <ArrowRightIcon className="size-3 shrink-0" />
        <IdentityLink avatar className="max-sm:truncate" identity={transaction.destination ?? ""} />
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <TickLink tick={transaction.tick} />
          <span className="hidden sm:inline-flex">
            <TransactionLink avatar hash={transaction.hash ?? ""} />
          </span>
        </span>
      </div>
    </li>
  );
}

function TransactionSkeleton() {
  return (
    <ul aria-hidden="true" className="space-y-1">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li className="min-h-[58px] rounded-lg px-3 py-2.5" key={index}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="h-3.5 w-24 rounded bg-surface-secondary/70" />
            <span className="h-2.5 w-16 rounded bg-surface-secondary/50" />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="size-5 rounded-full bg-surface-secondary/60" />
            <span className="h-2.5 w-20 rounded bg-surface-secondary/60" />
            <span className="size-3 rounded bg-surface-secondary/60" />
            <span className="h-2.5 w-20 rounded bg-surface-secondary/60" />
            <span className="ml-auto h-2.5 w-16 rounded bg-surface-secondary/50" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LatestTransactions({
  isLoading,
  transactions,
}: {
  isLoading?: boolean;
  transactions: Transaction[];
}) {
  if (isLoading && transactions.length === 0) {
    return <TransactionSkeleton />;
  }

  if (transactions.length === 0) {
    return <p className="py-12 text-center text-muted text-sm">No transactions indexed yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.hash ?? `${transaction.tick}-${transaction.tx_index}`}
          transaction={transaction}
        />
      ))}
    </ul>
  );
}
