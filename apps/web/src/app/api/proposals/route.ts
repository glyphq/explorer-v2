import { getProposalListJson, getProposals } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export async function GET() {
  const precomputed = await getProposalListJson();
  if (precomputed) {
    return new Response(precomputed, {
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
        "content-type": "application/json",
      },
    });
  }

  const proposals = await getProposals();
  return Response.json(
    {
      active: proposals.active,
      ended: proposals.ended,
      source: proposals.source,
    },
    {
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
