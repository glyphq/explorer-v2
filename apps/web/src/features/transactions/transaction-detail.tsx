"use client";

import type { ReactNode } from "react";
import { ActorLabel } from "@/components/explorer/actor-label";
import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import { BurnMark } from "@/components/explorer/contract-mark";
import {
  useContractByIndex,
  useTransactionContract,
} from "@/components/explorer/contract-provider";
import { parseEventBody } from "@/components/explorer/event-summary";
import {
  CopyableId,
  CopyButton,
  EpochLink,
  IdentityLink,
  TickLink,
} from "@/components/explorer/links";
import { SectionHeading } from "@/components/explorer/page-header";
import { ErrorState } from "@/components/explorer/state";
import type { Event, TransactionEffect } from "@/lib/api/generated/types.gen";
import { useSpecialEvents, useTick, useTransactionEffects } from "@/lib/api/hooks";
import { classNames, countLabel, formatInteger, formatQu, formatTimestamp } from "@/lib/format";
import { decodeCustomMessage } from "@/lib/transactions/special";
import { parseSpecialHash, type SpecialTransactionRef } from "@/lib/transactions/special-hash";

import { ContractCallPanel } from "./contract-call";
import { BoxLabel } from "./box-label";
import { useTransactionSignature } from "./use-transaction-signature";

const EFFECT_LABELS: Record<string, string> = {
  asset_ownership_change: "Asset ownership",
  asset_possession_change: "Asset possession",
  burning: "Burn",
  contract_debug: "Contract debug",
  contract_error: "Contract error",
  contract_information: "Contract info",
  contract_warning: "Contract warning",
  custom_message: "Custom message",
  qu_transfer: "QUBIC transfer",
};

type ActivityEntry = {
  effect?: TransactionEffect;
  event?: Event;
  key: string;
};

function TransactionShell({ children }: { children: ReactNode }) {
  return <div className="page-width px-4 py-8 lg:px-8">{children}</div>;
}

function MetaItem({ boxClassName, children }: { boxClassName?: string; children: ReactNode }) {
  return (
    <div
      className={classNames(
        "inline-flex max-w-full items-center rounded-lg px-3 py-1.5 text-[11px] leading-4 [&_a]:text-[11px]",
        boxClassName ?? "bg-surface text-foreground [&_a]:text-foreground",
      )}
    >
      {children}
    </div>
  );
}

function StatusValue({ status }: { status: string | undefined }) {
  if (!status) {
    return null;
  }

  const failed = status !== "success";

  return (
    <MetaItem
      boxClassName={
        failed ? "bg-danger/10 font-medium text-danger" : "bg-success/10 font-medium text-success"
      }
    >
      <span className="capitalize">{status}</span>
    </MetaItem>
  );
}

function Actor({ full = false, identity }: { full?: boolean; identity: string | undefined }) {
  if (!identity) {
    return <span className="text-muted text-xs">—</span>;
  }

  return <IdentityLink avatar full={full} identity={identity} />;
}

function SignatureField({ hash, tick }: { hash: string; tick: number | undefined }) {
  const signature = useTransactionSignature(hash, tick);

  return (
    <div className="min-w-0">
      <BoxLabel>Signature</BoxLabel>
      <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface px-3 py-2">
        {signature.isPending ? (
          <span className="h-3.5 w-64 max-w-full animate-pulse rounded bg-surface-secondary" />
        ) : signature.data ? (
          <>
            <code className="min-w-0 break-all font-mono text-[11px] text-foreground leading-4">
              {signature.data}
            </code>
            <CopyButton
              className="-my-0.5 -mr-0.5"
              label="Copy transaction signature"
              value={signature.data}
            />
          </>
        ) : (
          <span
            className="text-[11px] text-muted"
            title="The tick archive does not contain this transaction."
          >
            Not available for this tick
          </span>
        )}
      </div>
    </div>
  );
}

function LabeledValue({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <BoxLabel>{label}</BoxLabel>
      <div className="inline-flex max-w-full items-center rounded-lg bg-surface px-3 py-1.5 font-mono text-[11px] text-foreground tabular-nums leading-4">
        {children}
      </div>
    </div>
  );
}

function RawInputSection({ inputData }: { inputData: string | undefined }) {
  const bytes = inputByteLength(inputData);

  if (!inputData || bytes === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <div className="flex items-end justify-between gap-3">
        <BoxLabel>Raw input data</BoxLabel>
        <span className="relative z-10 -mb-1 flex shrink-0 items-center gap-1">
          <span className="px-1 font-mono text-[10px] text-muted tabular-nums">
            {formatInteger(bytes)} bytes
          </span>
          <CopyButton label="Copy raw input data" value={inputData} />
        </span>
      </div>
      <div className="rounded-lg bg-surface px-3 py-2">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-foreground text-xs leading-5">
          {inputData}
        </pre>
      </div>
    </section>
  );
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function breakIdentifier(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1\u200B$2");
}

function inputByteLength(value: string | undefined): number {
  return Math.ceil((value?.replace(/^0x/i, "").length ?? 0) / 2);
}

function mergeActivity(effects: TransactionEffect[], events: Event[]): ActivityEntry[] {
  const entries = new Map<string, ActivityEntry>();

  effects.forEach((effect, index) => {
    const key = `log:${effect.log_id ?? `effect-${index}`}`;
    entries.set(key, { effect, key });
  });

  events.forEach((event, index) => {
    const key = `log:${event.log_id ?? `event-${index}`}`;
    const existing = entries.get(key);
    if (existing) {
      existing.event = event;
    } else {
      entries.set(key, { event, key });
    }
  });

  return [...entries.values()].sort((left, right) => {
    const leftLog = left.effect?.log_id ?? left.event?.log_id ?? Number.MAX_SAFE_INTEGER;
    const rightLog = right.effect?.log_id ?? right.event?.log_id ?? Number.MAX_SAFE_INTEGER;
    return leftLog - rightLog;
  });
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const { effect, event } = entry;
  const body = parseEventBody(event?.body);
  const custom = decodeCustomMessage(textValue(body?.raw));
  const contractIndex =
    effect?.contract_index ??
    effect?.managing_contract ??
    numberValue(body?.contract_index) ??
    numberValue(body?.managing_contract);
  const contract = useContractByIndex(contractIndex);
  const kind = effect?.kind ?? event?.type_name ?? "event";
  const label = custom?.label ?? EFFECT_LABELS[kind] ?? kind.replaceAll("_", " ");
  const from = effect?.from ?? textValue(body?.from);
  const to = effect?.to ?? textValue(body?.to);
  const amount = effect?.amount ?? numberValue(body?.amount);
  const shares = effect?.shares ?? numberValue(body?.shares);
  const name = effect?.name ?? textValue(body?.name);
  const status = custom?.status;
  const logId = effect?.log_id ?? event?.log_id;
  const value =
    amount !== undefined && amount > 0
      ? formatQu(amount)
      : shares === undefined
        ? null
        : `${formatInteger(shares)}${name ? ` ${name}` : ""}`;

  return (
    <ActivityTableRow interactive={false}>
      <td className="px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {kind === "burning" ? <BurnMark size={14} /> : null}
          <span className="font-medium text-foreground text-xs">{label}</span>
          {status && status.tone !== "success" ? (
            <span
              className={
                status.tone === "danger"
                  ? "font-medium text-[10px] text-danger"
                  : "text-[10px] text-muted"
              }
            >
              {status.label}
            </span>
          ) : null}
        </div>
        {custom?.fields.length ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            {custom.fields.slice(0, 4).map((field) => (
              <span key={field.label}>
                {field.label}{" "}
                <span className="text-foreground" title={field.title}>
                  {field.value}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 text-xs">
        {contract ? (
          <span className="block max-w-40 truncate text-foreground" title={contract.name}>
            {contract.name}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <ActorLabel identity={from} />
      </td>
      <td className="px-3 py-3">
        <ActorLabel identity={to} />
      </td>
      <td className="px-3 py-3 text-right">
        {value ? (
          <span className="whitespace-nowrap font-medium text-foreground text-xs tabular-nums">
            {value}
          </span>
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-[10px] text-muted">
        {logId === undefined || logId === null ? "—" : formatInteger(logId)}
      </td>
    </ActivityTableRow>
  );
}

function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  return (
    <ActivityTable label="Events" minWidth="min-w-[940px]">
      <ActivityTableHead>
        <th className="w-[28%] px-4 py-3 font-normal">Event</th>
        <th className="w-[16%] px-3 py-3 font-normal">Contract</th>
        <th className="w-[18%] px-3 py-3 font-normal">From</th>
        <th className="w-[18%] px-3 py-3 font-normal">To</th>
        <th className="w-[12%] px-3 py-3 text-right font-normal">Value</th>
        <th className="w-[8%] px-4 py-3 text-right font-normal">Log</th>
      </ActivityTableHead>
      <tbody>
        {entries.map((entry) => (
          <ActivityRow entry={entry} key={entry.key} />
        ))}
      </tbody>
    </ActivityTable>
  );
}

const ACTIVITY_SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-28", header: "Event", width: "w-[28%]" },
  { barClassName: "w-20", header: "Contract", width: "w-[16%]" },
  { barClassName: "w-24", header: "From", width: "w-[18%]" },
  { barClassName: "w-24", header: "To", width: "w-[18%]" },
  { align: "right", barClassName: "w-12", header: "Value", width: "w-[12%]" },
  { align: "right", barClassName: "w-8", header: "Log", width: "w-[8%]" },
];

function ActivitySkeleton() {
  return (
    <ActivityTableSkeleton
      columns={ACTIVITY_SKELETON_COLUMNS}
      label="Loading events"
      minWidth="min-w-[940px]"
      rows={3}
    />
  );
}

function TransactionDetailContent({ hash }: { hash: string }) {
  const effects = useTransactionEffects(hash);
  const effectsData = effects.data?.data;
  const data = effectsData?.transaction;
  const unavailable = effects.isSuccess && !data;
  const call = useTransactionContract(data);
  const entries = mergeActivity(effectsData?.effects ?? [], effectsData?.events ?? []);

  const title = data
    ? call.kind === "transfer"
      ? "Transfer"
      : call.kind === "special"
        ? (call.special?.label ?? "System transaction")
        : (call.procedure?.name ?? "Contract call")
    : "Transaction";
  const showAmount = data?.amount !== undefined && (call.kind === "transfer" || data.amount > 0);
  const showActivity = effects.isLoading || entries.length > 0;

  if (effects.isError || unavailable) {
    return (
      <TransactionShell>
        <ErrorState
          message={effects.error?.message ?? "This transaction is not indexed."}
          onRetry={() => effects.refetch()}
        />
      </TransactionShell>
    );
  }

  return (
    <TransactionShell>
      <div>
        <section className="pb-7">
          <h1 className="break-words font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
            {breakIdentifier(title)}
          </h1>
          <div className="mt-2 min-w-0 text-muted text-xs">
            <CopyableId value={hash} />
          </div>

          {data ? (
            <>
              <div className="mt-1.5 text-[11px] text-muted">
                <time dateTime={data.timestamp} title={formatTimestamp(data.timestamp)}>
                  {formatTimestamp(data.timestamp)}
                </time>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                <StatusValue status={data.status} />
                <MetaItem>
                  <TickLink tick={data.tick} />
                </MetaItem>
                <MetaItem>
                  <EpochLink epoch={data.epoch} />
                </MetaItem>
              </div>

              <div className="mt-4 grid gap-3">
                {showAmount ? (
                  <div>
                    <BoxLabel>Amount</BoxLabel>
                    <p className="inline-flex max-w-full items-center rounded-lg bg-surface px-3 py-2 font-semibold text-xl tabular-nums tracking-tight">
                      {formatQu(data.amount)}
                    </p>
                  </div>
                ) : null}

                <div>
                  <BoxLabel>From</BoxLabel>
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface px-3 py-2">
                    <Actor full identity={data.source} />
                    {data.source ? (
                      <CopyButton
                        className="-my-0.5 -mr-0.5"
                        label="Copy source identity"
                        value={data.source}
                      />
                    ) : null}
                  </div>
                </div>

                <div>
                  <BoxLabel>To</BoxLabel>
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface px-3 py-2">
                    <Actor full identity={data.destination} />
                    {data.destination ? (
                      <CopyButton
                        className="-my-0.5 -mr-0.5"
                        label="Copy destination identity"
                        value={data.destination}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-2">
              {[0, 1, 2].map((index) => (
                <div className="h-4 w-2/3 animate-pulse rounded bg-surface-secondary" key={index} />
              ))}
            </div>
          )}
        </section>

        <ContractCallPanel transaction={data} />
        <RawInputSection inputData={data?.input_data} />

        {data ? (
          <section className="py-6">
            <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
              <LabeledValue label="Input type">{data.input_type ?? "—"}</LabeledValue>
              <LabeledValue label="Input size">
                {formatInteger(inputByteLength(data.input_data))} bytes
              </LabeledValue>
            </div>
            <div className="mt-6">
              <SignatureField hash={hash} tick={data.tick} />
            </div>
          </section>
        ) : null}

        {showActivity ? (
          <section className="py-6">
            <SectionHeading
              description={entries.length > 0 ? countLabel(entries.length, "event") : undefined}
              title="Events"
            />
            {effects.isLoading ? <ActivitySkeleton /> : <ActivityList entries={entries} />}
          </section>
        ) : null}
      </div>
    </TransactionShell>
  );
}

function SpecialTransactionDetail({ special }: { special: SpecialTransactionRef }) {
  const tick = useTick(special.tick, false);
  const events = useSpecialEvents(special.tick, special.hash);
  const tickData = tick.data?.data;
  const eventRows = events.data ?? [];
  const entries = mergeActivity([], eventRows);

  if (tick.isError || events.isError) {
    return (
      <TransactionShell>
        <ErrorState
          message={
            (tick.error ?? events.error)?.message ?? "Could not load this special transaction."
          }
          onRetry={() => {
            tick.refetch();
            events.refetch();
          }}
        />
      </TransactionShell>
    );
  }

  return (
    <TransactionShell>
      <div>
        <section className="pb-7">
          <h1 className="break-words font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
            {breakIdentifier(special.displayLabel)}
          </h1>
          <div className="mt-2 min-w-0 text-muted text-xs">
            <CopyableId value={special.hash} />
          </div>

          {tick.isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="h-3 w-44 animate-pulse rounded bg-surface-secondary" />
              <div className="h-7 w-56 animate-pulse rounded bg-surface-secondary" />
            </div>
          ) : (
            <>
              <div className="mt-1.5 text-[11px] text-muted">
                <time dateTime={tickData?.timestamp} title={formatTimestamp(tickData?.timestamp)}>
                  {formatTimestamp(tickData?.timestamp)}
                </time>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                <MetaItem>
                  <TickLink tick={special.tick} />
                </MetaItem>
                <MetaItem>
                  <EpochLink epoch={tickData?.epoch} />
                </MetaItem>
              </div>
            </>
          )}
        </section>

        {events.isLoading || entries.length > 0 ? (
          <section className="py-6">
            <SectionHeading
              description={entries.length > 0 ? countLabel(entries.length, "event") : undefined}
              title="Events"
            />
            {events.isLoading ? <ActivitySkeleton /> : <ActivityList entries={entries} />}
          </section>
        ) : null}
      </div>
    </TransactionShell>
  );
}

export function TransactionDetail({ hash }: { hash: string }) {
  const special = parseSpecialHash(hash);
  if (!special && hash.toLowerCase().startsWith("special:")) {
    return (
      <TransactionShell>
        <ErrorState message="This special transaction id is not valid." />
      </TransactionShell>
    );
  }
  return special ? (
    <SpecialTransactionDetail special={special} />
  ) : (
    <TransactionDetailContent hash={hash} />
  );
}
