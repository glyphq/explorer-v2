import Link from "next/link";

import { ContractMark } from "@/components/explorer/contract-mark";
import type { CcfTreasury } from "@/lib/ccf-treasury";
import { formatCompact, formatPercent, formatUsdValue } from "@/lib/format";

export function CcfTreasuryStrip({ treasury }: { treasury: CcfTreasury }) {
  const spentShare =
    treasury.incoming > 0 ? Math.min(100, (treasury.outgoing / treasury.incoming) * 100) : 0;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <Link
        className="inline-flex items-center gap-2 rounded-full bg-surface-secondary px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-surface"
        href="/contracts/ccf"
      >
        <ContractMark name="CCF" size={14} />
        CCF
      </Link>
      <span className="font-medium text-foreground tabular">
        {formatCompact(treasury.balance)} QUBIC
      </span>
      {treasury.balanceUsd === undefined ? null : (
        <span className="text-muted tabular">≈ {formatUsdValue(treasury.balanceUsd)}</span>
      )}
      <span className="text-muted">{formatPercent(spentShare, 1)} paid out</span>
      <Link
        className="text-muted transition-colors hover:text-foreground"
        href={`/accounts/${treasury.identity}`}
      >
        Treasury account
      </Link>
    </div>
  );
}
