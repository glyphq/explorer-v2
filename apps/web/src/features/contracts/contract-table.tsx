import type { Route } from "next";
import Link from "next/link";

import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
} from "@/components/explorer/activity-table";
import { ContractMark } from "@/components/explorer/contract-mark";
import type { ContractSummary } from "@/lib/contracts/types";
import { formatInteger } from "@/lib/format";

function ContractRow({ contract }: { contract: ContractSummary }) {
  return (
    <ActivityTableRow>
      <td className="px-4 py-3 text-muted text-xs tabular-nums">{formatInteger(contract.index)}</td>
      <td className="px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ContractMark name={contract.name} size={18} />
          <div className="min-w-0">
            <Link
              className="block truncate font-medium text-foreground text-xs transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
              href={`/contracts/${contract.name.toLowerCase()}` as Route}
            >
              {contract.name}
            </Link>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="block truncate font-mono text-[10px] text-muted" title={contract.address}>
          {contract.address}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-foreground text-xs tabular-nums">
        {formatInteger(contract.procedures.length)}
      </td>
      <td className="px-3 py-3 text-right text-foreground text-xs tabular-nums">
        {formatInteger(contract.functionCount)}
      </td>
    </ActivityTableRow>
  );
}

function ContractTable({ contracts }: { contracts: ContractSummary[] }) {
  return (
    <ActivityTable label="Smart contracts" minWidth="min-w-[1040px]">
      <ActivityTableHead>
        <th className="w-[7%] px-4 py-3 font-normal">Index</th>
        <th className="w-[24%] px-3 py-3 font-normal">Contract</th>
        <th className="w-[46%] px-3 py-3 font-normal">Address</th>
        <th className="w-[11%] px-3 py-3 text-right font-normal">Procedures</th>
        <th className="w-[12%] px-4 py-3 text-right font-normal">Functions</th>
      </ActivityTableHead>
      <tbody>
        {contracts.map((contract) => (
          <ContractRow contract={contract} key={contract.index} />
        ))}
      </tbody>
    </ActivityTable>
  );
}

export { ContractTable };
