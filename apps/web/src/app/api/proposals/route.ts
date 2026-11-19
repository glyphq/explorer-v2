import { getProposals } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export async function GET() {
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
