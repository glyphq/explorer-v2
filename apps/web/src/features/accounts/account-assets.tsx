"use client";

import { BoxLabel } from "@/components/explorer/box-label";
import type { OwnedAsset } from "@/lib/api/generated/types.gen";
import { useWalletAssets } from "@/lib/api/hooks";
import { formatInteger } from "@/lib/format";

function assetKey(asset: OwnedAsset): string {
  if (asset.ownership_index !== undefined) {
    return `ownership-${asset.ownership_index}`;
  }
  if (asset.universe_index !== undefined) {
    return `universe-${asset.universe_index}`;
  }
  return `${asset.issuer}-${asset.name}`;
}

function AssetChip({ asset }: { asset: OwnedAsset }) {
  const name = asset.name ?? "Unnamed asset";

  return (
    <div className="inline-flex w-fit max-w-full items-baseline gap-1.5 rounded-lg bg-surface-secondary px-3 py-2">
      <span className="whitespace-nowrap font-semibold text-[13px] tabular-nums leading-5 tracking-tight">
        {formatInteger(asset.shares)}
      </span>
      <span className="truncate font-medium text-[10px] text-muted uppercase tracking-[0.12em]">
        {name}
      </span>
    </div>
  );
}

export function AccountAssets({ identity }: { identity: string }) {
  const walletAssets = useWalletAssets(identity, "owned");
  const owned = [...(walletAssets.data?.data?.owned ?? [])].sort(
    (left, right) => right.shares - left.shares,
  );

  if (owned.length === 0) {
    return null;
  }

  return (
    <section className="pb-6">
      <div className="w-fit max-w-full">
        <BoxLabel>Assets</BoxLabel>
        <div className="rounded-lg bg-surface p-2.5">
          <div className="flex flex-wrap gap-2">
            {owned.map((asset) => (
              <AssetChip asset={asset} key={assetKey(asset)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
