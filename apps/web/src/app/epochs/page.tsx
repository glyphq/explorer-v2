"use client";

import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import { EpochRow, RecordEmpty, RecordList, RecordSkeleton } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { pageRows, useEpochs } from "@/lib/api/hooks";

export default function EpochsPage() {
  const epochs = useEpochs(25);
  const rows = pageRows(epochs.data?.pages);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="Every epoch, with its tick range, activity, and elected computors."
        title="Epochs"
      />

      {epochs.isError ? (
        <ErrorState
          message={epochs.error.message}
          onRetry={() => {
            epochs.refetch();
          }}
        />
      ) : (
        <>
          <div className="rounded-2xl bg-surface p-1.5">
            {epochs.isLoading ? (
              <RecordSkeleton rows={8} />
            ) : rows.length === 0 ? (
              <RecordEmpty>No epochs yet.</RecordEmpty>
            ) : (
              <RecordList>
                {rows.map((epoch) => (
                  <EpochRow epoch={epoch} key={epoch.epoch} />
                ))}
              </RecordList>
            )}
          </div>
          <LoadMore
            fetchNextPage={() => {
              epochs.fetchNextPage();
            }}
            hasNextPage={epochs.hasNextPage}
            isFetchingNextPage={epochs.isFetchingNextPage}
            loaded={rows.length}
          />
        </>
      )}
    </div>
  );
}
