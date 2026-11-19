import type { Metadata } from "next";

import { AccountDetail } from "@/features/accounts/account-detail";
import { findContractSummary } from "@/lib/contracts/registry";
import { shorten } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ identity: string }>;
}): Promise<Metadata> {
  const { identity } = await params;
  const contract = findContractSummary(identity);
  const title = contract
    ? `${contract.name} smart contract`
    : `Account ${shorten(identity, 10, 8)}`;
  return {
    description: contract
      ? `${contract.name} contract address, balance and activity on Qubic.`
      : "Account balance, activity and counterparties.",
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
  return <AccountDetail identity={identity} />;
}
