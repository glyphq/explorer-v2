import type { Route } from "next";

import { shorten } from "@/lib/format";
import { parseSpecialHash } from "@/lib/transactions/special-hash";

export interface TransactionTarget {
  href: Route;
  label: string;
  title: string;
}

export function transactionTarget(hash: string | undefined): TransactionTarget | null {
  if (!hash) {
    return null;
  }

  const special = parseSpecialHash(hash);
  const target = special?.hash ?? hash;

  return {
    href: `/transactions/${target}` as Route,
    label: special ? special.displayLabel : shorten(hash, 8, 6),
    title: special ? `${special.label} · ${target}` : hash,
  };
}
