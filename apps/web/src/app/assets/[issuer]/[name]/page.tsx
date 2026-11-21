import { AssetDetail } from "@/features/assets/asset-detail";

// Asset data is fetched client-side; cache the route shell at the edge.
export const dynamic = "force-static";
export const revalidate = 86400;

export default async function AssetPage({
  params,
}: {
  params: Promise<{ issuer: string; name: string }>;
}) {
  const { issuer, name } = await params;
  return <AssetDetail issuer={issuer} name={name} />;
}
