import type { Metadata } from "next";

import { ProposalDetail } from "@/features/proposals/proposal-detail";
import type { Proposal } from "@/lib/proposals";
import seed from "@/lib/proposals-seed.json";

type ProposalPageProps = {
  params: Promise<{ contract: string; index: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  const routes = new Map<string, { contract: string; index: string }>();
  for (const proposal of seed) {
    const contract =
      proposal.contractIndex === 6 ? "gqmprop" : proposal.contractIndex === 8 ? "ccf" : undefined;
    if (!contract) {
      continue;
    }
    const index = proposal.slug ?? String(proposal.proposalIndex);
    routes.set(`${contract}/${index}`, { contract, index });
  }
  return [...routes.values()];
}

function findSeedProposal(contract: string, route: string): Proposal | undefined {
  const contractIndex =
    contract.toLowerCase() === "gqmprop" ? 6 : contract.toLowerCase() === "ccf" ? 8 : undefined;
  if (!contractIndex) {
    return undefined;
  }
  return (seed as Proposal[]).find(
    (proposal) =>
      proposal.contractIndex === contractIndex &&
      (proposal.slug ? proposal.slug === route : String(proposal.proposalIndex) === route),
  );
}

export async function generateMetadata({ params }: ProposalPageProps): Promise<Metadata> {
  const { contract, index } = await params;
  return {
    description: `Qubic proposal ${contract.toUpperCase()} #${index}, including its on-chain vote record.`,
    title: `Proposal ${contract.toUpperCase()} #${index}`,
  };
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { contract, index } = await params;
  return (
    <ProposalDetail
      contract={contract}
      initialProposal={findSeedProposal(contract, index)}
      route={index}
    />
  );
}
