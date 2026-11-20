import type { Metadata } from "next";

import { ProposalDetailRoute } from "@/features/proposals/proposal-detail-route";

export const metadata: Metadata = {
  description: "Qubic proposal details, including its on-chain vote record.",
  title: "Proposal",
};

export default function ProposalViewPage() {
  return <ProposalDetailRoute />;
}
