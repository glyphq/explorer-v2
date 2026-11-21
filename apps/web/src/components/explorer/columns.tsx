"use client";

import { Chip } from "@heroui/react";
import { createColumnHelper } from "@tanstack/react-table";
import type { tableFeaturesConfig } from "@/components/explorer/data-table";
import { EpochLink, IdentityLink, TickLink } from "@/components/explorer/links";
import type {
  AssetHolder,
  AssetTransfer,
  Computor,
  Identity,
  Tick,
} from "@/lib/api/generated/types.gen";
import { formatInteger, formatRelativeTime, formatTimestamp, shorten } from "@/lib/format";

export type IdentityRow = Identity & {
  indexed_balance?: number;
  spectrum_balance?: number;
  balance_source?: string;
};

const tickHelper = createColumnHelper<typeof tableFeaturesConfig, Tick>();
export const tickColumns = tickHelper.columns([
  tickHelper.accessor("tick", {
    cell: ({ getValue }) => <TickLink tick={getValue()} />,
    header: "Tick",
  }),
  tickHelper.accessor("epoch", {
    cell: ({ getValue }) => <EpochLink epoch={getValue()} />,
    header: "Epoch",
  }),
  tickHelper.accessor("transaction_count", {
    cell: ({ getValue }) => <span className="tabular">{formatInteger(getValue())}</span>,
    header: "Transactions",
  }),
  tickHelper.accessor("event_count", {
    cell: ({ getValue }) => <span className="tabular">{formatInteger(getValue())}</span>,
    header: "Events",
  }),
  tickHelper.accessor("verification", {
    cell: ({ getValue }) => (
      <Chip color="success" size="sm" variant="soft">
        {getValue() ?? "unknown"}
      </Chip>
    ),
    header: "Evidence",
  }),
  tickHelper.accessor("timestamp", {
    cell: ({ getValue }) => (
      <span className="text-foreground tabular-nums" title={formatTimestamp(getValue())}>
        {formatRelativeTime(getValue())}
      </span>
    ),
    header: "Observed",
  }),
]);

const computorHelper = createColumnHelper<typeof tableFeaturesConfig, Computor>();
export const computorColumns = computorHelper.columns([
  computorHelper.accessor("computor_index", {
    cell: ({ getValue }) => <span className="tabular text-muted">{getValue()}</span>,
    header: "Index",
  }),
  computorHelper.accessor("identity", {
    cell: ({ getValue }) => <IdentityLink full identity={getValue()} />,
    header: "Identity",
  }),
  computorHelper.accessor("public_key", {
    cell: ({ getValue }) => (
      <span className="font-mono text-muted text-xs" title={getValue()}>
        {shorten(getValue(), 12, 8)}
      </span>
    ),
    header: "Public key",
  }),
]);

const transferHelper = createColumnHelper<typeof tableFeaturesConfig, AssetTransfer>();
export const transferColumns = transferHelper.columns([
  transferHelper.accessor("kind", {
    cell: ({ getValue }) => (
      <Chip color="accent" size="sm" variant="soft">
        {getValue()}
      </Chip>
    ),
    header: "Kind",
  }),
  transferHelper.accessor("from", {
    cell: ({ getValue }) => <IdentityLink identity={getValue()} />,
    header: "From",
  }),
  transferHelper.accessor("to", {
    cell: ({ getValue }) => <IdentityLink identity={getValue()} />,
    header: "To",
  }),
  transferHelper.accessor("shares", {
    cell: ({ getValue }) => <span className="tabular">{formatInteger(getValue())}</span>,
    header: "Shares",
  }),
  transferHelper.accessor("tick", {
    cell: ({ getValue }) => <TickLink tick={getValue()} />,
    header: "Tick",
  }),
  transferHelper.accessor("timestamp", {
    cell: ({ getValue }) => (
      <span className="text-foreground tabular-nums" title={formatTimestamp(getValue())}>
        {formatRelativeTime(getValue())}
      </span>
    ),
    header: "Observed",
  }),
]);

const holderHelper = createColumnHelper<typeof tableFeaturesConfig, AssetHolder>();
export const holderColumns = holderHelper.columns([
  holderHelper.accessor("identity", {
    cell: ({ getValue }) => <IdentityLink identity={getValue()} />,
    header: "Holder",
  }),
  holderHelper.accessor("shares", {
    cell: ({ getValue }) => <span className="tabular">{formatInteger(getValue())}</span>,
    header: "Shares",
  }),
]);
