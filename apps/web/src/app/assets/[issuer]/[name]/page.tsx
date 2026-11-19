import { AssetDetail } from "@/features/assets/asset-detail";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ issuer: string; name: string }>;
}) {
  const { issuer, name } = await params;
  return <AssetDetail issuer={issuer} name={name} />;
}
