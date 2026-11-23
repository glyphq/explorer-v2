"use client";

import { Button, Label, ListBox, ListBoxItem, SearchField, Select } from "@heroui/react";
import { CloseCircleIcon } from "@solar-icons/react/linear/close-circle";
import { MagnifierIcon } from "@solar-icons/react/linear/magnifier";
import { useMemo, useState } from "react";

import {
  ActivityTable as ActivityTableBase,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import { ActorLabel } from "@/components/explorer/actor-label";
import { useTransactionContract } from "@/components/explorer/contract-provider";
import { TickLink, TransactionLink } from "@/components/explorer/links";
import { isZeroIdentity } from "@/lib/contracts/constants";
import { formatQu, formatTimestamp, formatTimestampCompact } from "@/lib/format";
import { parseSpecialHash } from "@/lib/transactions/special-hash";

import type { ActivityGroup } from "./activity-feed";

type ActivityKind = "incoming" | "outgoing" | "call" | "system";
type ActivityFilter = "all" | ActivityKind;
type PeriodFilter = "all" | "24h" | "7d" | "30d";

type FilterOption<T extends string> = {
  value: T;
  label: string;
};

const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  call: "Contract call",
  incoming: "Incoming",
  outgoing: "Outgoing",
  system: "System event",
};

const ACTIVITY_OPTIONS: readonly FilterOption<ActivityFilter>[] = [
  { label: "All activity", value: "all" },
  { label: "Incoming", value: "incoming" },
  { label: "Outgoing", value: "outgoing" },
  { label: "Contract calls", value: "call" },
  { label: "System events", value: "system" },
];

const PERIOD_OPTIONS: readonly FilterOption<PeriodFilter>[] = [
  { label: "Any time", value: "all" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
];

function activityKind(group: ActivityGroup, identity: string): ActivityKind {
  const { transaction } = group;
  if (parseSpecialHash(transaction.hash)) {
    return "system";
  }
  if (isZeroIdentity(transaction.destination) && (transaction.input_type ?? 0) > 0) {
    return "system";
  }
  const isTransfer = (transaction.input_type ?? 0) === 0;

  if (!isTransfer) {
    return "call";
  }

  if (transaction.source === identity) {
    return "outgoing";
  }

  if (transaction.destination === identity) {
    return "incoming";
  }

  return "outgoing";
}

function searchText(group: ActivityGroup, identity: string): string {
  const { transaction } = group;
  const kind = activityKind(group, identity);
  const amount =
    transaction.amount === undefined || transaction.amount === null
      ? ""
      : `${transaction.amount} ${formatQu(transaction.amount)}`;

  return [
    ACTIVITY_KIND_LABELS[kind],
    transaction.source,
    transaction.destination,
    transaction.hash,
    transaction.tick,
    transaction.input_type,
    transaction.status,
    amount,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" ")
    .toLowerCase();
}

function timestampValue(group: ActivityGroup): number {
  const parsed = Date.parse(group.transaction.timestamp ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function periodCutoff(period: PeriodFilter): number | null {
  if (period === "all") {
    return null;
  }

  const hours = period === "24h" ? 24 : period === "7d" ? 24 * 7 : 24 * 30;
  return Date.now() - hours * 60 * 60 * 1000;
}

function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly FilterOption<T>[];
  value: T;
}) {
  return (
    <Select
      aria-label={label}
      className="w-auto shrink-0"
      onChange={(key) => {
        if (key !== null) {
          onChange(String(key) as T);
        }
      }}
      value={value}
      variant="secondary"
    >
      <Label className="sr-only">{label}</Label>
      <Select.Trigger className="h-9 w-auto gap-2 rounded-lg px-3 text-xs">
        <Select.Value />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBoxItem id={option.value} key={option.value} textValue={option.label}>
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function InputType({ transaction }: { transaction: ActivityGroup["transaction"] }) {
  const call = useTransactionContract(transaction);
  const inputType = call.inputType;
  const special = parseSpecialHash(transaction.hash);
  const label = special
    ? special.displayLabel
    : call.kind === "special"
      ? (call.special?.label ?? "System transaction")
      : call.kind === "call"
        ? (call.procedure?.name ?? `Call ${inputType}`)
        : "Transfer";

  return (
    <span
      className="block max-w-full truncate text-foreground text-xs"
      title={
        special
          ? `${special.label} · ${special.hash}`
          : call.kind === "special"
            ? `${call.special?.label ?? "System transaction"} · input type ${inputType}`
            : call.procedure
              ? `${call.contract?.name}.${call.procedure.name} · input type ${inputType}`
              : `Input type ${inputType}`
      }
    >
      {label}
    </span>
  );
}

function TimeCell({ timestamp }: { timestamp: string | null | undefined }) {
  if (!timestamp) {
    return <span className="text-muted text-xs">—</span>;
  }

  return (
    <time
      className="whitespace-nowrap text-foreground text-xs tabular-nums"
      dateTime={timestamp}
      title={formatTimestamp(timestamp)}
    >
      {formatTimestampCompact(timestamp)}
    </time>
  );
}

function ActivityEmpty({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-muted text-sm">
        {filtered ? "No activity matches these filters." : "No activity yet."}
      </p>
      {filtered ? (
        <Button onPress={onClear} size="sm" variant="ghost">
          <CloseCircleIcon aria-hidden className="size-3.5" />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-28", header: "Tx ID", width: "w-[16%]" },
  { barClassName: "w-20", header: "Tx type", width: "w-[15%]" },
  { align: "right", barClassName: "w-10", header: "Tick", width: "w-[9%]" },
  {
    align: "right",
    barClassName: "w-24",
    header: "Timestamp",
    width: "w-[14%]",
  },
  { barClassName: "w-24", header: "Source", width: "w-[15%]" },
  { barClassName: "w-24", header: "Destination", width: "w-[15%]" },
  { align: "right", barClassName: "w-12", header: "Amount", width: "w-[16%]" },
];

export function ActivityTable({
  groups,
  identity,
  isLoading,
}: {
  groups: ActivityGroup[];
  identity: string;
  isLoading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const cutoff = periodCutoff(periodFilter);

    return groups.filter((group) => {
      const kind = activityKind(group, identity);
      if (activityFilter !== "all" && kind !== activityFilter) {
        return false;
      }
      if (cutoff !== null) {
        const timestamp = timestampValue(group);
        if (timestamp === 0 || timestamp < cutoff) {
          return false;
        }
      }
      return !needle || searchText(group, identity).includes(needle);
    });
  }, [activityFilter, groups, identity, periodFilter, query]);

  const hasFilters = query.trim().length > 0 || activityFilter !== "all" || periodFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setActivityFilter("all");
    setPeriodFilter("all");
  };

  if (isLoading) {
    return (
      <ActivityTableSkeleton
        columns={SKELETON_COLUMNS}
        label="Loading activity"
        minWidth="min-w-[1080px]"
        rows={6}
      />
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-[4px] bg-surface">
        <ActivityEmpty filtered={false} onClear={clearFilters} />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchField
          className="min-w-0 flex-1 basis-full sm:max-w-sm"
          onChange={setQuery}
          value={query}
          variant="secondary"
        >
          <Label className="sr-only">Search activity</Label>
          <SearchField.Group>
            <SearchField.SearchIcon>
              <MagnifierIcon className="size-4" />
            </SearchField.SearchIcon>
            <SearchField.Input placeholder="Transaction, address, tick" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <p aria-live="polite" className="sr-only">
          {rows.length} of {groups.length} activities
        </p>
        <FilterSelect
          label="Filter by activity"
          onChange={setActivityFilter}
          options={ACTIVITY_OPTIONS}
          value={activityFilter}
        />
        <FilterSelect
          label="Filter by time"
          onChange={setPeriodFilter}
          options={PERIOD_OPTIONS}
          value={periodFilter}
        />
        {hasFilters ? (
          <Button className="ml-auto sm:ml-0" onPress={clearFilters} size="sm" variant="ghost">
            <CloseCircleIcon aria-hidden className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      <ActivityTableBase label="Recent activity" minWidth="min-w-[1080px]">
        <ActivityTableHead>
          <th className="w-[16%] px-4 py-3 font-normal">Tx ID</th>
          <th className="w-[15%] px-3 py-3 font-normal">Tx type</th>
          <th className="w-[9%] px-3 py-3 text-right font-normal">Tick</th>
          <th className="w-[14%] px-4 py-3 text-right font-normal">Timestamp</th>
          <th className="w-[15%] px-3 py-3 font-normal">Source</th>
          <th className="w-[15%] px-3 py-3 font-normal">Destination</th>
          <th className="w-[16%] px-3 py-3 text-right font-normal">Amount</th>
        </ActivityTableHead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <ActivityEmpty filtered={hasFilters} onClear={clearFilters} />
              </td>
            </tr>
          ) : (
            rows.map((group, index) => {
              const { transaction } = group;
              const kind = activityKind(group, identity);
              const key = transaction.hash ?? `activity-${transaction.tick ?? "row"}-${index}`;
              const failed = transaction.status && transaction.status !== "success";
              const hasAmount = transaction.amount !== undefined && transaction.amount !== null;
              const isTransfer = kind === "incoming" || kind === "outgoing";

              return (
                <ActivityTableRow interactive={false} key={key}>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <TransactionLink className="min-w-0 truncate" hash={transaction.hash ?? ""} />
                      {failed ? (
                        <span className="shrink-0 text-danger text-xs">{transaction.status}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <InputType transaction={transaction} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <TickLink className="whitespace-nowrap" tick={transaction.tick} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TimeCell timestamp={transaction.timestamp} />
                  </td>
                  <td className="px-3 py-3">
                    <ActorLabel identity={transaction.source} />
                  </td>
                  <td className="px-3 py-3">
                    <ActorLabel identity={transaction.destination} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    {hasAmount ? (
                      <span
                        className={`whitespace-nowrap text-xs tabular-nums ${
                          isTransfer ? "font-medium text-foreground" : "text-muted"
                        }`}
                      >
                        {formatQu(transaction.amount)}
                      </span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                </ActivityTableRow>
              );
            })
          )}
        </tbody>
      </ActivityTableBase>
    </div>
  );
}
