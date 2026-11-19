import type { Metadata } from "next";

import { EpochDetail } from "@/features/epochs/epoch-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ epoch: string }>;
}): Promise<Metadata> {
  const { epoch } = await params;
  const title = `Epoch ${epoch}`;
  return {
    description: "Epoch summary, computors and activity.",
    openGraph: { title },
    title,
    twitter: { title },
  };
}

export default async function EpochPage({ params }: { params: Promise<{ epoch: string }> }) {
  const { epoch } = await params;
  return <EpochDetail epoch={Number(epoch)} />;
}
