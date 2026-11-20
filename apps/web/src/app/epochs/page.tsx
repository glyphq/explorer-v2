"use client";

import { InfiniteScroll } from "@/components/explorer/infinite-scroll";
import { PageHeader } from "@/components/explorer/page-header";
import { RecordEmpty, RecordSkeleton } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { EpochTable } from "@/features/epochs/epoch-table";
import { pageRows, useEpochs } from "@/lib/api/hooks";

export default function EpochsPage() {
  const epochs = useEpochs(25);
  const rows = pageRows(epochs.data?.pages);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader description="Every epoch, with its tick range and activity." title="Epochs" />

      {epochs.isError ? (
        <ErrorState
          message={epochs.error.message}
          onRetry={() => {
            epochs.refetch();
          }}
        />
      ) : (
        <>
          {epochs.isLoading ? (
            <div className="rounded-2xl bg-surface p-1.5">
              <RecordSkeleton rows={8} />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-surface">
              <RecordEmpty>No epochs yet.</RecordEmpty>
            </div>
          ) : (
            <EpochTable epochs={rows} />
          )}
          {epochs.isLoading ? null : (
            <InfiniteScroll
              fetchNextPage={() => {
                epochs.fetchNextPage();
              }}
              hasNextPage={epochs.hasNextPage}
              isFetchingNextPage={epochs.isFetchingNextPage}
              loaded={rows.length}
              noun="epochs"
            />
          )}
        </>
      )}
    </div>
  );
}
