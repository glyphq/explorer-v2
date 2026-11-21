import type { Metadata } from "next";

import { TickDetail } from "@/features/ticks/tick-detail";

// Tick data is fetched client-side; cache the route shell at the edge.
export const dynamic = "force-static";
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tick: string }>;
}): Promise<Metadata> {
  const { tick } = await params;
  const title = `Tick ${Number(tick).toLocaleString("en-US")}`;
  return {
    description: "Tick header, quorum evidence, transactions and events.",
    openGraph: {
      images: [
        {
          alt: `${title} · Glyph Explorer`,
          height: 630,
          url: "/og/tick.png",
          width: 1200,
        },
      ],
      title,
    },
    title,
    twitter: { images: ["/og/tick.png"], title },
  };
}

export default async function TickPage({ params }: { params: Promise<{ tick: string }> }) {
  const { tick } = await params;
  return <TickDetail tick={Number(tick)} />;
}
