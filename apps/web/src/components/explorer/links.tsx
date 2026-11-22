"use client";

import { Button } from "@heroui/react";
import { CheckIcon } from "@solar-icons/react/linear/check";
import { CopyIcon } from "@solar-icons/react/linear/copy";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { sileo } from "sileo";

import { classNames, shorten } from "@/lib/format";
import { parseSpecialHash } from "@/lib/transactions/special-hash";
import { ContractMark } from "./contract-mark";
import { useContract } from "./contract-provider";
import { IdentityAvatar } from "./identity-avatar";

const idClass = "font-mono text-xs text-foreground transition-colors hover:text-accent";
const contractClass =
  "font-sans text-xs font-medium text-foreground transition-colors hover:text-accent";
export function IdentityLink({
  avatar = false,
  identity,
  className,
  full = false,
}: {
  avatar?: boolean;
  identity: string;
  className?: string;
  full?: boolean;
}) {
  const contract = useContract(identity);

  if (!identity) {
    return <span className="text-muted text-xs">—</span>;
  }

  if (contract) {
    const name = (
      <Link
        className={classNames(contractClass, className)}
        href={`/contracts/${contract.name.toLowerCase()}` as Route}
        title={`${contract.name} · ${identity}`}
      >
        {contract.name}
      </Link>
    );

    if (!avatar) {
      return name;
    }

    return (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <ContractMark name={contract.name} size={18} />
        {name}
      </span>
    );
  }

  const link = (
    <Link
      className={classNames(idClass, full ? "min-w-0 break-all" : undefined, className)}
      href={`/accounts/${identity}` as Route}
      title={identity}
    >
      {full ? identity : shorten(identity, 4, 4)}
    </Link>
  );

  if (!avatar) {
    return link;
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <IdentityAvatar value={identity} />
      {link}
    </span>
  );
}

export function TransactionLink({
  avatar = false,
  hash,
  className,
  full = false,
}: {
  avatar?: boolean;
  hash: string;
  className?: string;
  full?: boolean;
}) {
  if (!hash) {
    return <span className="text-muted text-xs">—</span>;
  }
  const special = parseSpecialHash(hash);
  const target = special?.hash ?? hash;
  const label = special ? special.displayLabel : full ? hash : shorten(hash, 8, 6);
  const link = (
    <Link
      className={classNames(idClass, className)}
      href={`/transactions/${target}` as Route}
      title={special ? `${special.label} · ${target}` : hash}
    >
      {label}
    </Link>
  );

  if (!avatar) {
    return link;
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {special ? (
        <ContractMark name={special.label} size={16} />
      ) : (
        <IdentityAvatar size={16} value={hash} variant="pixel" />
      )}
      {link}
    </span>
  );
}

export function TickLink({
  tick,
  className,
}: {
  tick: number | null | undefined;
  className?: string;
}) {
  if (tick === null || tick === undefined) {
    return <span className="text-muted">—</span>;
  }
  return (
    <Link
      className={classNames(idClass, className)}
      href={`/ticks/${tick}` as Route}
      title={`Tick ${tick.toLocaleString("en-US")}`}
    >
      {tick.toLocaleString("en-US")}
    </Link>
  );
}

export function EpochLink({
  epoch,
  className,
}: {
  epoch: number | null | undefined;
  className?: string;
}) {
  if (epoch === null || epoch === undefined) {
    return <span className="text-muted">—</span>;
  }
  return (
    <Link className={classNames(idClass, className)} href={`/epochs/${epoch}` as Route}>
      {epoch}
    </Link>
  );
}

export function CopyButton({
  className,
  description,
  label = "Copy value",
  value,
}: {
  className?: string;
  description?: string;
  label?: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      aria-label={copied ? "Copied" : label}
      className={classNames("shrink-0 text-muted", className)}
      isIconOnly
      onPress={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
          sileo.success({
            description: description ?? shorten(value, 16, 8),
            title: "Copied to clipboard",
          });
        } catch {
          // Clipboard access can be unavailable in insecure or embedded contexts.
          sileo.error({
            description: "Clipboard access is unavailable.",
            title: "Could not copy",
          });
        }
      }}
      size="sm"
      variant="ghost"
    >
      {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

export function CopyableId({ full = true, value }: { full?: boolean; value: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {full ? (
        <>
          <span className="hidden min-w-0 break-all font-mono text-xs sm:block sm:text-[15px]">
            {value}
          </span>
          <span className="min-w-0 truncate font-mono text-xs sm:hidden" title={value}>
            {shorten(value, 4, 4)}
          </span>
        </>
      ) : (
        <span className="min-w-0 max-w-48 truncate font-mono text-xs" title={value}>
          {shorten(value, 4, 4)}
        </span>
      )}
      <CopyButton value={value} />
    </span>
  );
}
