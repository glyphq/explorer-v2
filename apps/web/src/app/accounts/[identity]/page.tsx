import type { Metadata } from "next";

import { AccountDetail } from "@/features/accounts/account-detail";
import { shorten } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ identity: string }>;
}): Promise<Metadata> {
  const { identity } = await params;
  const title = `Account ${shorten(identity, 10, 8)}`;
  return {
    description: "Account balance, activity and counterparties.",
    openGraph: { title },
    title,
    twitter: { title },
  };
}

export default async function AccountPage({ params }: { params: Promise<{ identity: string }> }) {
  const { identity } = await params;
  return <AccountDetail identity={identity} />;
}
