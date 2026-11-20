"use client";

import type { ReactNode } from "react";

import type { Asset, Identity } from "@/lib/api/generated/types.gen";
import { countLabel, formatInteger, formatQu } from "@/lib/format";
import { IdentityAvatar } from "./identity-avatar";
import { IdentityLink, TickLink } from "./links";

export function RecordList({ children }: { children: ReactNode }) {
  return <ul className="space-y-0.5">{children}</ul>;
}

export function RecordRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={`rounded-xl px-3 py-3.5 transition-colors hover:bg-surface-secondary sm:px-4 ${className}`}
    >
      {children}
    </li>
  );
}

export function RecordSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="flex items-center gap-3 px-3 py-4" key={index}>
          <div className="size-7 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-pulse rounded bg-surface-secondary" />
            <div className="h-2.5 w-3/5 animate-pulse rounded bg-surface-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountRow({ identity }: { identity: Identity }) {
  const value = identity.identity ?? "";
  const net = (identity.incoming_amount ?? 0) - (identity.outgoing_amount ?? 0);

  return (
    <RecordRow>
      <div className="flex items-center gap-3">
        <IdentityAvatar size={30} value={value} />
        <div className="min-w-0 flex-1">
          <IdentityLink identity={value} />
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            <span>{countLabel(identity.transfer_count, "transfer")}</span>
            <span className="inline-flex items-center gap-1">
              last seen <TickLink tick={identity.last_seen_tick} />
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular font-medium text-foreground text-sm">
            {formatQu(identity.balance)}
          </p>
          <p className="tabular mt-0.5 text-[10px] text-muted">
            {net > 0 ? "+" : ""}
            {formatQu(net)} net
          </p>
        </div>
      </div>
    </RecordRow>
  );
}

export function AssetRow({ asset }: { asset: Asset }) {
  return (
    <RecordRow>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">{asset.name ?? "Unnamed asset"}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              issuer <IdentityLink identity={asset.issuer ?? ""} />
            </span>
            {asset.unit ? <span>{asset.unit}</span> : null}
            <span>{countLabel(asset.decimals, "decimal")}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular font-medium text-foreground text-sm">
            {formatInteger(asset.shares)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">shares</p>
        </div>
      </div>
    </RecordRow>
  );
}

export function RecordEmpty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-16 text-center text-muted text-sm">{children}</p>;
}
