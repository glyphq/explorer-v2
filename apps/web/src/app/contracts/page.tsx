import type { Metadata } from "next";

import { PageHeader } from "@/components/explorer/page-header";
import { ContractTable } from "@/features/contracts/contract-table";
import { CONTRACT_METADATA, contractSummaries } from "@/lib/contracts/registry";
import { countLabel, formatInteger } from "@/lib/format";

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

      <ContractTable contracts={contractSummaries} />
      <p className="flex min-h-14 items-center justify-center py-6 text-muted text-xs">
        End of contracts · {formatInteger(contractSummaries.length)} listed
      </p>
    </div>
  );
}
