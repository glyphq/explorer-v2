"use client";

import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";
import { AsciiSkeleton } from "ascii-reveal";
import { AnimatePresence, motion } from "motion/react";

import type { Transaction } from "@/lib/api/generated/types.gen";
import { formatQu, formatRelativeTime } from "@/lib/format";

import { IdentityLink, TickLink, TransactionLink } from "./links";

export function LatestTransactions({
  isLoading,
  transactions,
}: {
  isLoading?: boolean;
  transactions: Transaction[];
}) {
  if (isLoading && transactions.length === 0) {
    return <AsciiSkeleton as="div" height={180} rows={5} variant="dither" width="100%" />;
  }

  if (transactions.length === 0) {
    return <p className="py-12 text-center text-muted text-sm">No transactions indexed yet.</p>;
  }

  return (
    <ul className="space-y-1">
      <AnimatePresence initial={false} mode="popLayout">
        {transactions.map((transaction) => (
          <motion.li
            animate={{ opacity: 1, y: 0 }}
            className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-secondary"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, y: -8 }}
            key={transaction.hash ?? `${transaction.tick}-${transaction.tx_index}`}
            layout
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-4">
                <p className="tabular font-mono font-semibold text-sm">
                  {formatQu(transaction.amount)}
                </p>
                <span className="shrink-0 text-[10px] text-muted">
                  {formatRelativeTime(transaction.timestamp)}
                </span>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
                <IdentityLink avatar identity={transaction.source ?? ""} />
                <ArrowRightIcon className="size-3 shrink-0" />
                <IdentityLink avatar identity={transaction.destination ?? ""} />
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  <TickLink tick={transaction.tick} />
                  <TransactionLink avatar hash={transaction.hash ?? ""} />
                </span>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
