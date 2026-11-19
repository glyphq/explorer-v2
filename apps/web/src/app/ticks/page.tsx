"use client";

import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import { RecordEmpty, RecordList, RecordSkeleton, TickRow } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
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
          <div className="rounded-2xl bg-surface p-1.5">
            {ticks.isLoading ? (
              <RecordSkeleton rows={10} />
            ) : rows.length === 0 ? (
              <RecordEmpty>No ticks yet.</RecordEmpty>
            ) : (
              <RecordList>
                {rows.map((tick) => (
                  <TickRow key={tick.tick} tick={tick} />
                ))}
              </RecordList>
            )}
          </div>
          <LoadMore
            fetchNextPage={() => {
              ticks.fetchNextPage();
            }}
            hasNextPage={ticks.hasNextPage}
            isFetchingNextPage={ticks.isFetchingNextPage}
            loaded={rows.length}
          />
        </>
      )}
    </div>
  );
}
