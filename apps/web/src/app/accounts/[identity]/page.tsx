import type { Metadata } from "next";

import { AccountDetail } from "@/features/accounts/account-detail";
import { findContractSummary } from "@/lib/contracts/registry";
import { shorten } from "@/lib/format";
import { getPublicProfile } from "@/lib/profiles/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ identity: string }>;
}): Promise<Metadata> {
  const { identity } = await params;
  const contract = findContractSummary(identity);
  const profile = contract ? null : await getPublicProfile(identity).catch(() => null);
  const title = contract
    ? `${contract.name} smart contract`
    : profile
      ? `${profile.displayName} (${shorten(identity, 6, 4)})`
      : `Account ${shorten(identity, 10, 8)}`;
  const description = contract
    ? `${contract.name} contract address, balance and activity on Qubic.`
    : profile
      ? profile.bio ||
        (profile.verification === "wallet"
          ? `${profile.displayName} is a wallet-verified Qubic identity. View balance and activity on Glyph Explorer.`
          : `${profile.displayName} is a curated exchange identity on Qubic. View balance and activity on Glyph Explorer.`)
      : "Account balance, activity, sources and destinations.";
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
  return <AccountDetail identity={identity} />;
}
