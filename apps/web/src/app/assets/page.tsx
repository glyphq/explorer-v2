"use client";

import { LoadMore } from "@/components/explorer/load-more";
import { PageHeader } from "@/components/explorer/page-header";
import { usePageLoading } from "@/components/explorer/page-reveal";
import { AssetRow, RecordEmpty, RecordList, RecordSkeleton } from "@/components/explorer/records";
import { ErrorState } from "@/components/explorer/state";
import { pageRows, useAssets } from "@/lib/api/hooks";

export default function AssetsPage() {
  const assets = useAssets(25);
  const rows = pageRows(assets.data?.pages);
  usePageLoading(assets.isLoading);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description="Assets issued in the index, with their holders and transfers."
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
              <RecordEmpty>No assets have been issued yet.</RecordEmpty>
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
