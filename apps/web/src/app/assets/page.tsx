"use client";

import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import { AssetRow, RecordEmpty, RecordList, RecordSkeleton } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { pageRows, useAssets } from "@/lib/api/hooks";

export default function AssetsPage() {
  const assets = useAssets(25);
  const rows = pageRows(assets.data?.pages);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 lg:px-8">
      <PageHeader
        description="Assets discovered from issuance events in the indexed range."
        title="Assets"
      />

      {assets.isError ? (
        <ErrorState
          message={assets.error.message}
          onRetry={() => {
            assets.refetch();
          }}
        />
      ) : (
        <>
          <div className="rounded-2xl bg-surface p-1.5">
            {assets.isLoading ? (
              <RecordSkeleton rows={8} />
            ) : rows.length === 0 ? (
              <RecordEmpty>No assets have been issued in the indexed range.</RecordEmpty>
            ) : (
              <RecordList>
                {rows.map((asset) => (
                  <AssetRow asset={asset} key={`${asset.issuer}-${asset.name}`} />
                ))}
              </RecordList>
            )}
          </div>
          <LoadMore
            fetchNextPage={() => {
              assets.fetchNextPage();
            }}
            hasNextPage={assets.hasNextPage}
            isFetchingNextPage={assets.isFetchingNextPage}
            loaded={rows.length}
          />
        </>
      )}
    </div>
  );
}
