import type { Metadata } from "next";

import { TransactionDetail } from "@/features/transactions/transaction-detail";
import { shorten } from "@/lib/format";
import { parseSpecialHash } from "@/lib/transactions/special-hash";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;
  const special = parseSpecialHash(hash);
  const title = special
    ? `${special.displayLabel} special transaction`
    : `Transaction ${shorten(hash, 10, 8)}`;
  const description = special
    ? `${special.label} system event in tick ${special.tick}.`
    : "Transaction details, effects and attached events.";
  return {
    description,
    openGraph: {
      images: [
        {
          alt: `${title} · Glyph Explorer`,
          height: 630,
          url: "/og/transaction.png",
          width: 1200,
        },
      ],
      title,
    },
    title,
    twitter: { images: ["/og/transaction.png"], title },
  };
}

export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return <TransactionDetail hash={hash} />;
}
