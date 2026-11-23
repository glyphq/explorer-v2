"use client";

import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";

import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import { IdentityAvatar } from "@/components/explorer/identity-avatar";
import { ExchangeLogo } from "@/features/exchanges/exchange-logo";
import { shorten } from "@/lib/format";

import { groupKnownAddresses, type KnownAddress } from "./known-address";

function GlyphMark({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-secondary"
      style={{ height: size, width: size }}
    >
      <img alt="" className="h-4/5 w-4/5" src="/brand/glyph-on-dark.png" />
    </span>
  );
}

function AddressMark({ address, size = 18 }: { address: KnownAddress; size?: number }) {
  if (address.kind === "glyph") {
    return <GlyphMark size={size === 16 ? 16 : 20} />;
  }
  if (address.kind === "exchange") {
    return (
      <ExchangeLogo
        className={`${size === 16 ? "size-4" : "size-[18px]"} shrink-0 rounded-full`}
        name={address.displayName}
      />
    );
  }
  return <IdentityAvatar size={size} value={address.identity} />;
}

function KnownAddressRow({ address }: { address: KnownAddress }) {
  return (
    <ActivityTableRow>
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <AddressMark address={address} />
          <span
            className="truncate font-medium text-foreground text-xs"
            title={address.displayName}
          >
            {address.displayName}
          </span>
        </div>
      </td>
      <td className="px-3 py-3">
        <Link
          className="min-w-0 truncate font-mono text-foreground text-xs transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
          href={`/accounts/${address.identity}` as Route}
          title={address.identity}
        >
          {shorten(address.identity, 4, 4)}
        </Link>
      </td>
    </ActivityTableRow>
  );
}

function KnownAddressTable({ addresses }: { addresses: KnownAddress[] }) {
  const groups = groupKnownAddresses(addresses);

  return (
    <ActivityTable label="Known addresses" minWidth="min-w-[640px]">
      <ActivityTableHead>
        <th className="w-[40%] px-4 py-3 font-normal">Name</th>
        <th className="w-[60%] px-3 py-3 font-normal">Address</th>
      </ActivityTableHead>
      <tbody>
        {groups.map((group) => (
          <Fragment key={group.kind}>
            <tr>
              <th
                className="px-4 pt-4 pb-1.5 text-left font-medium text-[10px] text-muted uppercase tracking-[0.14em]"
                colSpan={2}
                scope="colgroup"
              >
                {group.label}
              </th>
            </tr>
            {group.addresses.map((address) => (
              <KnownAddressRow address={address} key={address.identity} />
            ))}
          </Fragment>
        ))}
      </tbody>
    </ActivityTable>
  );
}

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-28", header: "Name", width: "w-[40%]" },
  { barClassName: "w-36", header: "Address", width: "w-[60%]" },
];

function KnownAddressTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ActivityTableSkeleton
      columns={SKELETON_COLUMNS}
      label="Loading known addresses"
      minWidth="min-w-[640px]"
      rows={rows}
    />
  );
}

export { KnownAddressTable, KnownAddressTableSkeleton };
