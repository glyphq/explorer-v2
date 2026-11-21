"use client";

import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import type { IdentityRow } from "@/components/explorer/columns";
import { IdentityLink, TickLink } from "@/components/explorer/links";
import { formatInteger, formatQu } from "@/lib/format";

function AccountRow({ account }: { account: IdentityRow }) {
  const identity = account.identity ?? "";

  return (
    <ActivityTableRow interactive={Boolean(identity)}>
      <td className="px-4 py-3">
        {identity ? (
          <IdentityLink
            avatar
            className="max-w-full truncate after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
            identity={identity}
          />
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <span className="whitespace-nowrap font-medium text-foreground text-xs tabular-nums">
          {formatQu(account.balance)}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="whitespace-nowrap text-foreground/80 text-xs tabular-nums">
          {formatQu(account.incoming_amount)}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="whitespace-nowrap text-foreground/80 text-xs tabular-nums">
          {formatQu(account.outgoing_amount)}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-muted text-xs tabular-nums">
        {formatInteger(account.transfer_count)}
      </td>
      <td className="px-4 py-3 text-right">
        <TickLink className="whitespace-nowrap text-[10px]" tick={account.last_seen_tick} />
      </td>
    </ActivityTableRow>
  );
}

export function AccountsTable({ accounts }: { accounts: IdentityRow[] }) {
  return (
    <ActivityTable label="Accounts" minWidth="min-w-[960px]">
      <ActivityTableHead>
        <th className="w-[26%] px-4 py-3 font-normal">Account</th>
        <th className="w-[20%] px-3 py-3 font-normal">Balance</th>
        <th className="w-[18%] px-3 py-3 font-normal">Incoming</th>
        <th className="w-[18%] px-3 py-3 font-normal">Outgoing</th>
        <th className="w-[8%] px-3 py-3 text-right font-normal">Transfers</th>
        <th className="w-[10%] px-4 py-3 text-right font-normal">Last seen</th>
      </ActivityTableHead>
      <tbody>
        {accounts.map((account, index) => (
          <AccountRow
            account={account}
            key={account.identity ?? `account-${account.last_seen_tick ?? index}`}
          />
        ))}
      </tbody>
    </ActivityTable>
  );
}

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-36", header: "Account", width: "w-[26%]" },
  { barClassName: "w-24", header: "Balance", width: "w-[20%]" },
  { barClassName: "w-20", header: "Incoming", width: "w-[18%]" },
  { barClassName: "w-20", header: "Outgoing", width: "w-[18%]" },
  { align: "right", barClassName: "w-10", header: "Transfers", width: "w-[8%]" },
  { align: "right", barClassName: "w-20", header: "Last seen", width: "w-[10%]" },
];

export function AccountsTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <ActivityTableSkeleton
      columns={SKELETON_COLUMNS}
      label="Loading accounts"
      minWidth="min-w-[960px]"
      rows={rows}
    />
  );
}
