import type { Metadata } from "next";

import { EpochDetail } from "@/features/epochs/epoch-detail";

// Epoch data is fetched client-side; cache the route shell at the edge.
export const dynamic = "force-static";
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ epoch: string }>;
}): Promise<Metadata> {
  const { epoch } = await params;
  const title = `Epoch ${epoch}`;
  return {
    description: "Epoch summary, computors and activity.",
    openGraph: {
      images: [
        {
          alt: `${title} · Glyph Explorer`,
          height: 630,
          url: "/og/epoch.png",
          width: 1200,
        },
      ],
      title,
    },
    title,
    twitter: { images: ["/og/epoch.png"], title },
  };
}

export default async function EpochPage({ params }: { params: Promise<{ epoch: string }> }) {
  const { epoch } = await params;
  return <EpochDetail epoch={Number(epoch)} />;
}
