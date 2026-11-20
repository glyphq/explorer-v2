"use client";

import { usePathname } from "next/navigation";

import { ProposalDetail } from "@/features/proposals/proposal-detail";

export function ProposalDetailRoute() {
  const pathname = usePathname();
  const [contract, route] = pathname.split("/").filter(Boolean).slice(1);

  if (!(contract && route)) {
    return null;
  }

  return <ProposalDetail contract={contract} route={route} />;
}
