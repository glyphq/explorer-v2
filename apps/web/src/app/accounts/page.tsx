"use client";

import type { IdentityRow } from "@/components/explorer/columns";
import { InfiniteScroll } from "@/components/explorer/infinite-scroll";
import { PageHeader } from "@/components/explorer/page-header";
import { usePageLoading } from "@/components/explorer/page-reveal";
import { RecordEmpty } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { AccountsTable, AccountsTableSkeleton } from "@/features/accounts/accounts-table";
import { pageRows, useIdentities } from "@/lib/api/hooks";

export default function AccountsPage() {
  const identities = useIdentities(25);
  const rows = pageRows(identities.data?.pages) as IdentityRow[];
  usePageLoading(identities.isLoading);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="Identities ranked by recent activity, with balances and transfer totals from the index."
        title="Identities"
      />

      {identities.isError ? (
        <ErrorState
          message={identities.error.message}
          onRetry={() => {
            identities.refetch();
          }}
        />
      ) : (
        <>
          {identities.isLoading ? (
            <AccountsTableSkeleton rows={10} />
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-surface">
              <RecordEmpty>No identities yet.</RecordEmpty>
            </div>
          ) : (
            <AccountsTable accounts={rows} />
          )}
          {identities.isLoading ? null : (
            <InfiniteScroll
              fetchNextPage={() => {
                identities.fetchNextPage();
              }}
              hasNextPage={identities.hasNextPage}
              isFetchingNextPage={identities.isFetchingNextPage}
              loaded={rows.length}
              noun="identities"
            />
          )}
        </>
      )}
    </div>
  );
}
