import type { Metadata } from "next";

import { ProposalDetail } from "@/features/proposals/proposal-detail";

type ProposalPageProps = {
  params: Promise<{ contract: string; index: string }>;
};

export async function generateMetadata({ params }: ProposalPageProps): Promise<Metadata> {
  const { contract, index } = await params;
  return {
    description: `Qubic proposal ${contract.toUpperCase()} #${index}, including its on-chain vote record.`,
    title: `Proposal ${contract.toUpperCase()} #${index}`,
  };
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { contract, index } = await params;
  return <ProposalDetail contract={contract} route={index} />;
}
