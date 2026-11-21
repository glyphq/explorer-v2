"use client";

import { InfiniteScroll } from "@/components/explorer/infinite-scroll";
import { PageHeader } from "@/components/explorer/page-header";
import { RecordEmpty } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { TickTable, TickTableSkeleton } from "@/features/ticks/tick-table";
import { pageRows, useTicks } from "@/lib/api/hooks";

export default function TicksPage() {
  const ticks = useTicks(25);
  const rows = pageRows(ticks.data?.pages);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader description="Every verified tick, newest first." title="Ticks" />

      {ticks.isError ? (
        <ErrorState
          message={ticks.error.message}
          onRetry={() => {
            ticks.refetch();
          }}
        />
      ) : (
        <>
          {ticks.isLoading ? (
            <TickTableSkeleton rows={10} />
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-surface">
              <RecordEmpty>No ticks yet.</RecordEmpty>
            </div>
          ) : (
            <TickTable ticks={rows} />
          )}
          {ticks.isLoading ? null : (
            <InfiniteScroll
              fetchNextPage={() => {
                ticks.fetchNextPage();
              }}
              hasNextPage={ticks.hasNextPage}
              isFetchingNextPage={ticks.isFetchingNextPage}
              loaded={rows.length}
              noun="ticks"
            />
          )}
        </>
      )}
    </div>
  );
}
