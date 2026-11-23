"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ProposalDetail } from "@/features/proposals/proposal-detail";

export function ProposalDetailRoute() {
  const pathname = usePathname();
  const [params, setParams] = useState<{ contract: string; route: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const search = new URLSearchParams(window.location.search);
      const [pathContract, pathRoute] = window.location.pathname
        .split("/")
        .filter(Boolean)
        .slice(1);
      const contract = search.get("contract") ?? pathContract;
      const route = search.get("index") ?? pathRoute;
      setParams(contract && route ? { contract, route } : null);
    };
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, [pathname]);
  if (!params) {
    return <div className="page-width px-4 py-8 lg:px-8" />;
  }

  return <ProposalDetail contract={params.contract} route={params.route} />;
}
