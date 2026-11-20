"use client";

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
    return <span className="text-muted">—</span>;
  }

  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center gap-1.5"
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
        className={
          contract
            ? "min-w-0 truncate font-medium text-foreground text-xs"
            : "min-w-0 truncate font-mono text-muted text-xs"
        }
      >
        {contract ? contract.name : shorten(identity, 6, 4)}
      </span>
    </span>
  );
}
