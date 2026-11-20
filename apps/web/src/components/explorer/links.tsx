"use client";

import { Button } from "@heroui/react";
import { CheckIcon } from "@solar-icons/react/linear/check";
import { CopyIcon } from "@solar-icons/react/linear/copy";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { sileo } from "sileo";

import { isZeroIdentity } from "@/lib/contracts/constants";
import { classNames, shorten } from "@/lib/format";
import { parseSpecialHash } from "@/lib/transactions/special-hash";

import { useContract } from "./contract-provider";
import { ContractMark, ZeroMark } from "./contract-mark";
import { IdentityAvatar } from "./identity-avatar";

const idClass =
  "font-mono text-xs text-foreground underline-offset-4 transition-colors hover:text-accent hover:underline";
const contractClass =
  "font-sans text-xs font-medium text-foreground underline-offset-4 transition-colors hover:text-accent hover:underline";
const zeroClass =
  "inline-flex items-center gap-1.5 font-sans text-xs font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline";

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

  if (isZeroIdentity(identity)) {
    return (
      <Link
        className={classNames(zeroClass, className)}
        href={`/accounts/${identity}` as Route}
        title={`${identity} · protocol zero address`}
      >
        <ZeroMark size={16} />
        Zero address
      </Link>
    );
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
      className={classNames(idClass, className)}
      href={`/accounts/${identity}` as Route}
      title={identity}
    >
      {full ? identity : shorten(identity, 8, 6)}
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

export function AssetLink({
  issuer,
  name,
  className,
}: {
  issuer: string;
  name: string;
  className?: string;
}) {
  return (
    <Link className={classNames(idClass, className)} href={`/assets/${issuer}/${name}` as Route}>
      {name}
    </Link>
  );
}

export function CopyButton({ label = "Copy value", value }: { label?: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      aria-label={copied ? "Copied" : label}
      isIconOnly
      onPress={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
          sileo.success({
            description: shorten(value, 16, 8),
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
    <span className="flex min-w-0 items-center gap-1">
      <span className={classNames("truncate font-mono text-xs", full ? "" : "max-w-48")}>
        {full ? value : shorten(value, 10, 8)}
      </span>
      <CopyButton value={value} />
    </span>
  );
}
