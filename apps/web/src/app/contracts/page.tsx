import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { ContractMark } from "@/components/explorer/contract-mark";
import { PageHeader } from "@/components/explorer/page-header";
import { countLabel, shorten } from "@/lib/format";
import { CONTRACT_METADATA, contractSummaries } from "@/lib/contracts/registry";

const sourceCommit = CONTRACT_METADATA.source.commit;
const sourceUrl = `https://github.com/${CONTRACT_METADATA.source.repository}/tree/${sourceCommit}`;

export const metadata: Metadata = {
  description:
    "Every smart contract deployed on Qubic, with callable procedures, functions and wire-format types.",
  title: "Smart contracts",
};

export default function ContractsPage() {
  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        description={
          <>
            Every smart contract deployed on Qubic, with its callable procedures, read-only
            functions and types. Metadata is generated from{" "}
            <a
              className="text-foreground underline underline-offset-4 hover:text-accent"
              href={sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              {CONTRACT_METADATA.source.repository}
            </a>{" "}
            at <span className="font-mono text-[11px]">{sourceCommit.slice(0, 7)}</span>.
          </>
        }
        title="Smart contracts"
      />

      <div className="mb-6 flex flex-wrap gap-2 text-muted text-xs">
        <span className="rounded-full bg-surface-secondary px-3 py-1.5">
          {countLabel(contractSummaries.length, "contract")}
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {contractSummaries.map((contract) => (
          <li key={contract.index}>
            <Link
              className="group flex h-full flex-col rounded-2xl bg-surface p-5 transition-colors hover:bg-surface-secondary"
              href={`/contracts/${contract.name.toLowerCase()}` as Route}
            >
              <div className="flex items-start justify-between gap-3">
                <ContractMark name={contract.name} size={40} />
                <span className="tabular text-[10px] text-muted">#{contract.index}</span>
              </div>
              <div className="mt-4 flex-1">
                <p className="font-medium text-foreground text-sm">{contract.name}</p>
                <p className="mt-1 text-muted text-xs">
                  {contract.assetName === contract.name ? null : (
                    <>
                      {contract.assetName}
                      <span className="px-1.5 text-muted/50">·</span>
                    </>
                  )}
                  {countLabel(contract.procedures.length, "procedure", "procedures")}
                  <span className="px-1.5 text-muted/50">·</span>
                  {countLabel(contract.functionCount, "function")}
                </p>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <span className="min-w-0 truncate font-mono text-[10px] text-muted">
                  {shorten(contract.address, 10, 8)}
                </span>
                <ArrowRightUpIcon className="size-3.5 shrink-0 text-muted transition-colors group-hover:text-foreground" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
