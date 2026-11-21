"use client";

import { AsciiSkeleton } from "ascii-reveal";

import { countLabel, formatQu } from "@/lib/format";

import type { IdentityRow } from "./columns";
import { IdentityLink, TickLink } from "./links";

export function AccountLeaderboard({
  accounts,
  isLoading,
}: {
  accounts: IdentityRow[];
  isLoading?: boolean;
}) {
  if (isLoading && accounts.length === 0) {
    return <AsciiSkeleton as="div" height={180} rows={5} variant="dither" width="100%" />;
  }

  if (accounts.length === 0) {
    return <p className="py-12 text-center text-muted text-sm">No identities yet.</p>;
  }

  const maxTransfers = Math.max(1, ...accounts.map((account) => account.transfer_count ?? 0));

  return (
    <ol className="space-y-1">
      {accounts.map((account) => {
        const transfers = account.transfer_count ?? 0;
        const balance = account.spectrum_balance ?? account.balance ?? account.indexed_balance ?? 0;
        return (
          <li
            className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-secondary"
            key={account.identity ?? ""}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <IdentityLink identity={account.identity ?? ""} />
                <span className="shrink-0 text-[10px] text-muted">
                  {countLabel(transfers, "transfer")}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-4 text-[11px] text-muted">
                <span className="tabular">{formatQu(balance)}</span>
                <span className="flex shrink-0 items-center gap-1">
                  last seen <TickLink tick={account.last_seen_tick} />
                </span>
              </div>
              <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className="h-full rounded-full bg-foreground/40 transition-all"
                  style={{
                    width: `${Math.max(3, (transfers / maxTransfers) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
