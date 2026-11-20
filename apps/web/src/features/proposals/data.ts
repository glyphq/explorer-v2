import type { ProposalSnapshot } from "@/lib/proposals";

export async function readProposals(signal: AbortSignal): Promise<ProposalSnapshot> {
  const response = await fetch("/api/proposals", { signal });
  if (!response.ok) {
    throw new Error("The proposal index did not answer. Try again in a moment.");
  }
  return (await response.json()) as ProposalSnapshot;
}
