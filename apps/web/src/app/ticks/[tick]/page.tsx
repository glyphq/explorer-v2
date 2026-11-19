import type { Metadata } from "next";

import { TickDetail } from "@/features/ticks/tick-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tick: string }>;
}): Promise<Metadata> {
  const { tick } = await params;
  const title = `Tick ${Number(tick).toLocaleString("en-US")}`;
  return {
    description: "Tick header, quorum evidence, transactions and events.",
    openGraph: { title },
    title,
    twitter: { title },
  };
}

export default async function TickPage({ params }: { params: Promise<{ tick: string }> }) {
  const { tick } = await params;
  return <TickDetail tick={Number(tick)} />;
}
