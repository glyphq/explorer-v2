import type { Metadata } from "next";

import { ClientOnly } from "@/components/explorer/client-only";
import { DetailSkeleton } from "@/components/explorer/detail-skeleton";
import { EpochDetail } from "@/features/epochs/epoch-detail";

// Epoch data is fetched client-side; keep the route shell cache short-lived.
export const dynamic = "force-static";
export const revalidate = 300;

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
  return (
    <ClientOnly fallback={<DetailSkeleton />}>
      <EpochDetail epoch={Number(epoch)} />
    </ClientOnly>
  );
}
