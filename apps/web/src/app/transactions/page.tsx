"use client";

import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import {
  RecordEmpty,
  RecordList,
  RecordSkeleton,
  TransactionRow,
} from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { pageRows, useTransactions } from "@/lib/api/hooks";

export default function TransactionsPage() {
  const transactions = useTransactions({}, 25);
  const rows = pageRows(transactions.data?.pages);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="Transfers and contract calls inside verified ticks, newest first."
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
          <div className="rounded-2xl bg-surface p-1.5">
            {transactions.isLoading ? (
              <RecordSkeleton rows={10} />
            ) : rows.length === 0 ? (
              <RecordEmpty>No transactions yet.</RecordEmpty>
            ) : (
              <RecordList>
                {rows.map((transaction) => (
                  <TransactionRow
                    key={transaction.hash ?? `${transaction.tick}-${transaction.tx_index}`}
                    transaction={transaction}
                  />
                ))}
              </RecordList>
            )}
          </div>
          <LoadMore
            fetchNextPage={() => {
              transactions.fetchNextPage();
            }}
            hasNextPage={transactions.hasNextPage}
            isFetchingNextPage={transactions.isFetchingNextPage}
            loaded={rows.length}
          />
        </>
      )}
    </div>
  );
}
