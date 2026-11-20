import type { Metadata } from "next";
import Link from "next/link";

import { ContractMark } from "@/components/explorer/contract-mark";
import { PageHeader } from "@/components/explorer/page-header";
import { ProposalsExplorer } from "@/features/proposals/proposals-explorer";

export const metadata: Metadata = {
  description:
    "Computor votes on Qubic General Quorum Proposals and Computor Controlled Fund requests.",
  title: "Proposals",
};

export default function ProposalsPage() {
  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        actions={
          <>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
              href="/contracts/gqmprop"
            >
              <ContractMark name="GQMPROP" size={16} />
              GQMPROP
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
              href="/contracts/ccf"
            >
              <ContractMark name="CCF" size={16} />
              CCF
            </Link>
          </>
        }
        description="Computor votes on General Quorum Proposals and Computor Controlled Fund requests, read from the GQMPROP and CCF contracts."
        title="Proposals"
      />

      <ProposalsExplorer />
    </div>
  );
}
