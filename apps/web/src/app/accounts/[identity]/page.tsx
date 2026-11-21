import type { Metadata } from "next";

import { ClientOnly } from "@/components/explorer/client-only";
import { DetailSkeleton } from "@/components/explorer/detail-skeleton";
import { AccountDetail } from "@/features/accounts/account-detail";
import { findContractSummary } from "@/lib/contracts/registry";
import { shorten } from "@/lib/format";

// The identity shell is client-rendered and the page data is fetched live, so
// only the shell needs caching. Keep it short-lived.
export const dynamic = "force-static";
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ identity: string }>;
}): Promise<Metadata> {
  const { identity } = await params;
  const contract = findContractSummary(identity);
  const title = contract
    ? `${contract.name} smart contract`
    : `Identity ${shorten(identity, 4, 4)}`;
  const description = contract
    ? `${contract.name} contract address, balance and activity on Qubic.`
    : "Identity balance, activity, sources and destinations.";
  return {
    description,
    openGraph: {
      images: [
        {
          alt: `${title} · Glyph Explorer`,
          height: 630,
          url: "/og/account.png",
          width: 1200,
        },
      ],
      title,
    },
    title,
    twitter: { images: ["/og/account.png"], title },
  };
}

export default async function AccountPage({ params }: { params: Promise<{ identity: string }> }) {
  const { identity } = await params;
  return (
    <ClientOnly fallback={<DetailSkeleton />}>
      <AccountDetail identity={identity} />
    </ClientOnly>
  );
}
