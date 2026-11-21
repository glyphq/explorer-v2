"use client";

import type { Route } from "next";
import Link from "next/link";

import { shorten } from "@/lib/format";

import { ContractMark } from "./contract-mark";
import { useContract } from "./contract-provider";
import { IdentityAvatar } from "./identity-avatar";

export function ActorLabel({
  identity,
  showAvatar = true,
}: {
  identity?: string;
  showAvatar?: boolean;
}) {
  const contract = useContract(identity);

  if (!identity) {
    return <span className="text-muted text-xs">—</span>;
  }

  const href = contract
    ? (`/contracts/${contract.name.toLowerCase()}` as Route)
    : (`/accounts/${identity}` as Route);

  return (
    <Link
      className="group/actor relative z-10 inline-flex min-w-0 max-w-full items-center gap-1.5"
      href={href}
      title={contract ? `${contract.name} · ${identity}` : identity}
    >
      {showAvatar ? (
        contract ? (
          <ContractMark name={contract.name} size={16} />
        ) : (
          <IdentityAvatar size={16} value={identity} />
        )
      ) : null}
      <span
        className={`min-w-0 truncate font-mono text-xs transition-colors group-hover/actor:text-accent ${
          contract ? "font-medium text-foreground" : "text-foreground"
        }`}
      >
        {contract ? contract.name : shorten(identity, 4, 4)}
      </span>
    </Link>
  );
}
