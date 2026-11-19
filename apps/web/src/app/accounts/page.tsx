"use client";

import type { IdentityRow } from "@/components/explorer/columns";
import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import { AccountRow, RecordEmpty, RecordList, RecordSkeleton } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { pageRows, useIdentities } from "@/lib/api/hooks";

export default function AccountsPage() {
  const identities = useIdentities(25);
  const rows = pageRows(identities.data?.pages) as IdentityRow[];

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="Accounts ranked by recent activity, with balances from the index."
        title="Accounts"
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
          <div className="rounded-2xl bg-surface p-1.5">
            {identities.isLoading ? (
              <RecordSkeleton rows={10} />
            ) : rows.length === 0 ? (
              <RecordEmpty>No accounts yet.</RecordEmpty>
            ) : (
              <RecordList>
                {rows.map((identity) => (
                  <AccountRow identity={identity} key={identity.identity} />
                ))}
              </RecordList>
            )}
          </div>
          <LoadMore
            fetchNextPage={() => {
              identities.fetchNextPage();
            }}
            hasNextPage={identities.hasNextPage}
            isFetchingNextPage={identities.isFetchingNextPage}
            loaded={rows.length}
          />
        </>
      )}
    </div>
  );
}
