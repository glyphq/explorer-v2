import type { Metadata } from "next";

import { TransactionDetail } from "@/features/transactions/transaction-detail";
import { shorten } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;
  const title = `Transaction ${shorten(hash, 10, 8)}`;
  return {
    description: "Transaction details, effects and attached events.",
    openGraph: { title },
    title,
    twitter: { title },
  };
}

export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return <TransactionDetail hash={hash} />;
}
