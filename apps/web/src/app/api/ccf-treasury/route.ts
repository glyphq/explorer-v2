import { getCcfTreasury } from "@/lib/ccf-treasury";

export const dynamic = "force-dynamic";

export async function GET() {
  const treasury = await getCcfTreasury();
  return Response.json(
    { treasury },
    {
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
