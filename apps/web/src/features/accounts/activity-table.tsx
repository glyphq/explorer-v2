"use client";

import {
  Button,
  Chip,
  Label,
  ListBox,
  ListBoxItem,
  SearchField,
  Select,
  Skeleton,
  Table,
} from "@heroui/react";
import { ArrowLeftDownIcon } from "@solar-icons/react/linear/arrow-left-down";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import { BellIcon } from "@solar-icons/react/linear/bell";
import { BellOffIcon } from "@solar-icons/react/linear/bell-off";
import { BellRingIcon } from "@solar-icons/react/linear/bell-ring";
import { BrainIcon } from "@solar-icons/react/linear/brain";
import { CalendarIcon } from "@solar-icons/react/linear/calendar";
import { CloseCircleIcon } from "@solar-icons/react/linear/close-circle";
import { CoinsIcon } from "@solar-icons/react/linear/coins";
import { LayersIcon } from "@solar-icons/react/linear/layers";
import { MagnifierIcon } from "@solar-icons/react/linear/magnifier";
import { MinusCircleIcon } from "@solar-icons/react/linear/minus-circle";
import { TagIcon } from "@solar-icons/react/linear/tag";
import { WalletMoneyIcon } from "@solar-icons/react/linear/wallet-money";
import { useMemo, useState } from "react";

import { useTransactionContract } from "@/components/explorer/contract-provider";
import { IdentityLink, TickLink, TransactionLink } from "@/components/explorer/links";
import { classNames, formatQu, formatTimestamp } from "@/lib/format";

import type { ActivityGroup } from "./activity-feed";

type ActivityKind = "incoming" | "outgoing" | "call";
type ActivityEvent = ActivityGroup["events"][number];
type ActivityFilter = "all" | ActivityKind;
type EventsFilter = "all" | "with" | "none";
type AmountFilter = "all" | "positive" | "zero";
type PeriodFilter = "all" | "24h" | "7d" | "30d";
type SortColumn = "time" | "inputType" | "counterparty" | "amount" | "tick";
type SortDirection = "ascending" | "descending";

type IconComponent = typeof ArrowLeftDownIcon;
type FilterOption<T extends string> = {
  value: T;
  label: string;
  icon: IconComponent;
};
type ActivityRow = {
  group: ActivityGroup;
  meta: ReturnType<typeof activityMeta>;
};

const ACTIVITY_META: Record<
  ActivityKind,
  {
    color: "accent" | "default" | "success";
    Icon: IconComponent;
    label: string;
  }
> = {
  call: { color: "default", Icon: BrainIcon, label: "Contract call" },
  incoming: { color: "success", Icon: ArrowLeftDownIcon, label: "Incoming" },
  outgoing: { color: "accent", Icon: ArrowRightUpIcon, label: "Outgoing" },
};

const ACTIVITY_OPTIONS: readonly FilterOption<ActivityFilter>[] = [
  { icon: LayersIcon, label: "All activity", value: "all" },
  { icon: ArrowLeftDownIcon, label: "Incoming", value: "incoming" },
  { icon: ArrowRightUpIcon, label: "Outgoing", value: "outgoing" },
  { icon: BrainIcon, label: "Contract call", value: "call" },
];

const EVENTS_OPTIONS: readonly FilterOption<EventsFilter>[] = [
  { icon: BellIcon, label: "All events", value: "all" },
  { icon: BellRingIcon, label: "With events", value: "with" },
  { icon: BellOffIcon, label: "No events", value: "none" },
];

const AMOUNT_OPTIONS: readonly FilterOption<AmountFilter>[] = [
  { icon: WalletMoneyIcon, label: "Any amount", value: "all" },
  { icon: CoinsIcon, label: "With amount", value: "positive" },
  { icon: MinusCircleIcon, label: "Zero amount", value: "zero" },
];

const PERIOD_OPTIONS: readonly FilterOption<PeriodFilter>[] = [
  { icon: CalendarIcon, label: "Any time", value: "all" },
  { icon: CalendarIcon, label: "Last 24 hours", value: "24h" },
  { icon: CalendarIcon, label: "Last 7 days", value: "7d" },
  { icon: CalendarIcon, label: "Last 30 days", value: "30d" },
];

function activityMeta(
  group: ActivityGroup,
  identity: string,
): {
  counterparty: string;
  kind: ActivityKind;
} {
  const { transaction } = group;
  const isTransfer = (transaction.input_type ?? 0) === 0;

  if (!isTransfer) {
    return {
      counterparty: transaction.destination ?? transaction.source ?? "",
      kind: "call",
    };
  }

  if (transaction.source === identity) {
    return {
      counterparty: transaction.destination ?? "",
      kind: "outgoing",
    };
  }

  if (transaction.destination === identity) {
    return {
      counterparty: transaction.source ?? "",
      kind: "incoming",
    };
  }

  return {
    counterparty: transaction.destination ?? transaction.source ?? "",
    kind: "outgoing",
  };
}

function searchText(group: ActivityGroup, identity: string): string {
  const { transaction } = group;
  const { counterparty, kind } = activityMeta(group, identity);
  const amount =
    transaction.amount === undefined || transaction.amount === null
      ? ""
      : `${transaction.amount} ${formatQu(transaction.amount)}`;

  return [
    ACTIVITY_META[kind].label,
    counterparty,
    transaction.source,
    transaction.destination,
    transaction.hash,
    transaction.tick,
    transaction.input_type,
    transaction.status,
    amount,
    ...group.events.map((event) => event.type_name),
    ...group.events.map((event) => event.source),
    ...group.events.map((event) => event.destination),
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

function formatEventType(value: string): string {
  return value.replaceAll("_", " ");
}

function eventTitle(event: ActivityEvent): string {
  const from = event.source ? `from ${event.source}` : null;
  const to = event.destination ? `to ${event.destination}` : null;
  return [event.type_name ?? "event", from, to].filter(Boolean).join(" ");
}

function isSortColumn(value: string): value is SortColumn {
  return (
    value === "time" ||
    value === "inputType" ||
    value === "counterparty" ||
    value === "amount" ||
    value === "tick"
  );
}

function compareRows(left: ActivityRow, right: ActivityRow, column: SortColumn): number {
  switch (column) {
    case "amount":
      return (left.group.transaction.amount ?? 0) - (right.group.transaction.amount ?? 0);
    case "counterparty":
      return left.meta.counterparty.localeCompare(right.meta.counterparty);
    case "inputType":
      return (left.group.transaction.input_type ?? 0) - (right.group.transaction.input_type ?? 0);
    case "tick":
      return (left.group.transaction.tick ?? 0) - (right.group.transaction.tick ?? 0);
    default:
      return timestampValue(left.group) - timestampValue(right.group);
  }
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
  const selected = options.find((option) => option.value === value) ?? options[0];
  const isDefault = selected?.value === options[0]?.value;

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
      <Select.Trigger
        className={classNames(
          "h-9 w-auto gap-2 rounded-full px-3 text-xs",
          !isDefault && "bg-surface-tertiary text-foreground ring-1 ring-foreground/15",
        )}
      >
        <Select.Value />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <ListBoxItem id={option.value} key={option.value} textValue={option.label}>
                <span className="flex items-center gap-2">
                  <OptionIcon aria-hidden className="size-3.5 text-muted" />
                  <span>{option.label}</span>
                </span>
              </ListBoxItem>
            );
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function TimeCell({ timestamp }: { timestamp: string | null | undefined }) {
  const formatted = formatTimestamp(timestamp);

  if (!timestamp) {
    return <span className="text-muted text-xs">—</span>;
  }

  return (
    <span className="tabular whitespace-nowrap text-xs text-foreground" title={formatted}>
      {formatted.replace(", ", " · ")}
    </span>
  );
}

function ActivityKindChip({ kind }: { kind: ActivityKind }) {
  const { color, Icon, label } = ACTIVITY_META[kind];

  return (
    <Chip color={color} size="sm" variant="soft">
      <span className="inline-flex items-center gap-1.5">
        <Icon aria-hidden className="size-3.5 shrink-0" />
        <span>{label}</span>
      </span>
    </Chip>
  );
}

function InputType({ transaction }: { transaction: ActivityGroup["transaction"] }) {
  const call = useTransactionContract(transaction);
  const inputType = call.inputType;
  const label = call.kind === "call" ? (call.procedure?.name ?? `Call ${inputType}`) : "Transfer";

  return (
    <span
      className="block max-w-36 truncate text-muted text-xs"
      title={
        call.procedure
          ? `${call.contract?.name}.${call.procedure.name} · input type ${inputType}`
          : `Input type ${inputType}`
      }
    >
      {label}
    </span>
  );
}

function ActivityCell({ events, kind }: { events: ActivityEvent[]; kind: ActivityKind }) {
  return (
    <div className="flex max-w-[18rem] flex-col items-start">
      <ActivityKindChip kind={kind} />

      {events.length === 0 ? null : (
        <div className="relative mt-2.5 ml-3 pl-5">
          <span
            aria-hidden
            className="absolute -top-2 bottom-2 left-0 w-px rounded-full bg-gradient-to-b from-foreground/25 via-foreground/10 to-transparent"
          />
          <ol
            aria-label={`${events.length} decoded ${events.length === 1 ? "event" : "events"}`}
            className="flex flex-col gap-2"
          >
            {events.map((event, index) => (
              <li
                className="relative min-w-0"
                key={event.log_id ?? `${event.tx_hash ?? event.hash ?? "event"}-${index}`}
                title={eventTitle(event)}
              >
                <span
                  aria-hidden
                  className="absolute -left-5 top-0 h-2.5 w-5 rounded-bl-[8px] border-foreground/20 border-b border-l"
                />
                <span className="inline-flex max-w-full items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium leading-4 text-foreground ring-1 ring-foreground/[0.06]">
                  <span className="truncate">{formatEventType(event.type_name ?? "event")}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton className="h-11 w-full rounded-lg" key={index} />
      ))}
    </div>
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

function hiddenColumnClass(columnId: string): string | undefined {
  return columnId === "tick" || columnId === "transaction" ? "hidden lg:table-cell" : undefined;
}

function cellClass(columnId: string): string {
  const base = columnId === "activity" || columnId === "time" ? "min-w-44" : "whitespace-nowrap";
  return `${base} px-2 py-2.5 align-top sm:px-2.5`;
}

function headerClass(columnId: string): string {
  const base =
    columnId === "amount"
      ? "px-2 text-right sm:px-2.5"
      : columnId === "time"
        ? "min-w-44 px-2 sm:px-2.5"
        : "px-2 sm:px-2.5";
  return `${base} whitespace-nowrap`;
}

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
  const [eventsFilter, setEventsFilter] = useState<EventsFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("descending");

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    for (const group of groups) {
      for (const event of group.events) {
        if (event.type_name) {
          types.add(event.type_name);
        }
      }
    }
    return [...types].sort((left, right) => left.localeCompare(right));
  }, [groups]);

  const eventTypeOptions = useMemo<FilterOption<string>[]>(
    () => [
      { icon: TagIcon, label: "All event types", value: "all" },
      ...eventTypes.map((type) => ({
        icon: TagIcon,
        label: formatEventType(type),
        value: type,
      })),
    ],
    [eventTypes],
  );

  const filteredRows = useMemo<ActivityRow[]>(() => {
    const needle = query.trim().toLowerCase();
    const cutoff = periodCutoff(periodFilter);
    const matched: ActivityRow[] = [];

    for (const group of groups) {
      const meta = activityMeta(group, identity);

      if (activityFilter !== "all" && meta.kind !== activityFilter) {
        continue;
      }
      if (eventsFilter === "with" && group.events.length === 0) {
        continue;
      }
      if (eventsFilter === "none" && group.events.length > 0) {
        continue;
      }
      if (
        eventTypeFilter !== "all" &&
        !group.events.some((event) => event.type_name === eventTypeFilter)
      ) {
        continue;
      }

      const amount = group.transaction.amount ?? 0;
      if (amountFilter === "positive" && amount <= 0) {
        continue;
      }
      if (amountFilter === "zero" && amount !== 0) {
        continue;
      }

      if (cutoff !== null) {
        const timestamp = timestampValue(group);
        if (timestamp === 0 || timestamp < cutoff) {
          continue;
        }
      }

      if (needle && !searchText(group, identity).includes(needle)) {
        continue;
      }

      matched.push({ group, meta });
    }

    return matched;
  }, [
    activityFilter,
    amountFilter,
    eventTypeFilter,
    eventsFilter,
    groups,
    identity,
    periodFilter,
    query,
  ]);

  const rows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((left, right) => {
      const difference = compareRows(left, right, sortColumn);
      return sortDirection === "ascending" ? difference : -difference;
    });
    return sorted;
  }, [filteredRows, sortColumn, sortDirection]);

  const hasFilters =
    query.trim().length > 0 ||
    activityFilter !== "all" ||
    eventsFilter !== "all" ||
    eventTypeFilter !== "all" ||
    amountFilter !== "all" ||
    periodFilter !== "all";
  const total = groups.length;
  const filteredTotal = filteredRows.length;
  const countLabel =
    filteredTotal === total
      ? `${total} ${total === 1 ? "activity" : "activities"}`
      : `${filteredTotal} of ${total}`;

  const clearFilters = () => {
    setQuery("");
    setActivityFilter("all");
    setEventsFilter("all");
    setEventTypeFilter("all");
    setAmountFilter("all");
    setPeriodFilter("all");
  };

  if (isLoading) {
    return <ActivitySkeleton />;
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <SearchField
          className="min-w-0 flex-1 basis-full sm:max-w-xs"
          onChange={setQuery}
          value={query}
          variant="secondary"
        >
          <Label className="sr-only">Search activity</Label>
          <SearchField.Group>
            <SearchField.SearchIcon>
              <MagnifierIcon className="size-4" />
            </SearchField.SearchIcon>
            <SearchField.Input placeholder="Address, transaction, tick, event" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <p aria-live="polite" className="sr-only">
          {countLabel}
        </p>
        <FilterSelect
          label="Filter by activity"
          onChange={setActivityFilter}
          options={ACTIVITY_OPTIONS}
          value={activityFilter}
        />
        <FilterSelect
          label="Filter by events"
          onChange={setEventsFilter}
          options={EVENTS_OPTIONS}
          value={eventsFilter}
        />
        {eventTypes.length > 0 ? (
          <FilterSelect
            label="Filter by event type"
            onChange={setEventTypeFilter}
            options={eventTypeOptions}
            value={eventTypeFilter}
          />
        ) : null}
        <FilterSelect
          label="Filter by amount"
          onChange={setAmountFilter}
          options={AMOUNT_OPTIONS}
          value={amountFilter}
        />
        <FilterSelect
          label="Filter by time"
          onChange={setPeriodFilter}
          options={PERIOD_OPTIONS}
          value={periodFilter}
        />
        {hasFilters ? (
          <Button
            aria-label="Clear filters"
            className="ml-auto"
            isIconOnly
            onPress={clearFilters}
            size="sm"
            variant="ghost"
          >
            <CloseCircleIcon aria-hidden className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <Table className="min-w-0" variant="secondary">
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Recent activity"
            className="min-w-[620px] lg:min-w-[900px] [&_tbody_td]:border-b-0 [&_tbody_tr]:border-b-0"
            onSortChange={(descriptor) => {
              const next = String(descriptor.column);
              if (isSortColumn(next)) {
                setSortColumn(next);
              }
              setSortDirection(descriptor.direction);
            }}
            sortDescriptor={{ column: sortColumn, direction: sortDirection }}
          >
            <Table.Header>
              <Table.Column allowsSorting className={headerClass("time")} id="time" isRowHeader>
                {({ sortDirection: direction }) => (
                  <Table.SortableColumnHeader sortDirection={direction}>
                    Time
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column className={headerClass("activity")} id="activity">
                Activity
              </Table.Column>
              <Table.Column allowsSorting className={headerClass("inputType")} id="inputType">
                {({ sortDirection: direction }) => (
                  <Table.SortableColumnHeader sortDirection={direction}>
                    Input type
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting className={headerClass("counterparty")} id="counterparty">
                {({ sortDirection: direction }) => (
                  <Table.SortableColumnHeader sortDirection={direction}>
                    Counterparty
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting className={headerClass("amount")} id="amount">
                {({ sortDirection: direction }) => (
                  <Table.SortableColumnHeader sortDirection={direction}>
                    Amount
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column
                allowsSorting
                className={classNames(headerClass("tick"), hiddenColumnClass("tick"))}
                id="tick"
              >
                {({ sortDirection: direction }) => (
                  <Table.SortableColumnHeader sortDirection={direction}>
                    Tick
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column
                className={classNames(headerClass("transaction"), hiddenColumnClass("transaction"))}
                id="transaction"
              >
                Transaction
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <ActivityEmpty filtered={hasFilters} onClear={clearFilters} />
              )}
            >
              {rows.map(({ group, meta }, index) => {
                const { transaction } = group;
                const rowId = transaction.hash ?? `activity-${transaction.tick ?? "row"}-${index}`;

                return (
                  <Table.Row id={rowId} key={rowId}>
                    <Table.Cell className={cellClass("time")}>
                      <TimeCell timestamp={transaction.timestamp} />
                    </Table.Cell>
                    <Table.Cell className={cellClass("activity")}>
                      <ActivityCell events={group.events} kind={meta.kind} />
                    </Table.Cell>
                    <Table.Cell className={cellClass("inputType")}>
                      <InputType transaction={transaction} />
                    </Table.Cell>
                    <Table.Cell className={cellClass("counterparty")}>
                      <IdentityLink avatar identity={meta.counterparty} />
                    </Table.Cell>
                    <Table.Cell className={classNames(cellClass("amount"), "text-right")}>
                      <span className="tabular text-xs">{formatQu(transaction.amount)}</span>
                    </Table.Cell>
                    <Table.Cell
                      className={classNames(cellClass("tick"), hiddenColumnClass("tick"))}
                    >
                      <TickLink tick={transaction.tick} />
                    </Table.Cell>
                    <Table.Cell
                      className={classNames(
                        cellClass("transaction"),
                        hiddenColumnClass("transaction"),
                      )}
                    >
                      <TransactionLink hash={transaction.hash ?? ""} />
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}
