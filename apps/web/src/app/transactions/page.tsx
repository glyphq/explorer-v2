"use client";

import { InfiniteScroll } from "@/components/explorer/infinite-scroll";
import { PageHeader } from "@/components/explorer/page-header";
import { RecordEmpty } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import {
  TransactionTable,
  TransactionTableSkeleton,
} from "@/features/transactions/transaction-table";
import { pageRows, useTransactions } from "@/lib/api/hooks";

export default function TransactionsPage() {
  const transactions = useTransactions({}, 25);
  const rows = pageRows(transactions.data?.pages);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="Transfers and contract calls inside verified ticks, with their events."
        title="Transactions"
      />

      {transactions.isError ? (
        <ErrorState
          message={transactions.error.message}
          onRetry={() => {
            transactions.refetch();
          }}
        />
      ) : (
        <>
          {transactions.isLoading ? (
            <TransactionTableSkeleton rows={10} />
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-surface">
              <RecordEmpty>No transactions yet.</RecordEmpty>
            </div>
          ) : (
            <TransactionTable transactions={rows} />
          )}
          {transactions.isLoading ? null : (
            <InfiniteScroll
              fetchNextPage={() => {
                transactions.fetchNextPage();
              }}
              hasNextPage={transactions.hasNextPage}
              isFetchingNextPage={transactions.isFetchingNextPage}
              loaded={rows.length}
              noun="transactions"
            />
          )}
        </>
      )}
    </div>
  );
}
