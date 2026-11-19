"use client";

import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";

import type { Event } from "@/lib/api/generated/types.gen";
import { formatInteger, formatQu, formatRelativeTime, formatTimestamp } from "@/lib/format";

import { IdentityLink, TickLink, TransactionLink } from "./links";

export type EventLike = Pick<Event, "body" | "log_id" | "tick" | "timestamp" | "type_name"> & {
  hash?: string;
  destination?: string;
  source?: string;
  amount?: number;
  role?: string;
  tx_hash?: string;
};

type EventBody = Record<string, unknown>;

export function parseEventBody(value: unknown): EventBody | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as EventBody)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? (value as EventBody) : null;
}

export function eventTransactionHash(event: EventLike): string | undefined {
  return event.tx_hash ?? event.hash;
}

function eventLabel(event: EventLike): string {
  return (event.type_name ?? "event").replaceAll("_", " ");
}

function bodyValue(body: EventBody | null, key: string): unknown {
  return body?.[key];
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function renderBodyValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value.length > 64 ? `${value.slice(0, 61)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function bodyFacts(body: EventBody | null): Array<{ label: string; value: string }> {
  if (!body) {
    return [];
  }
  return Object.entries(body)
    .filter(([key]) => !["from", "to", "amount", "raw"].includes(key))
    .map(([key, value]) => ({
      label: key.replaceAll("_", " "),
      value: renderBodyValue(value),
    }))
    .filter((fact): fact is { label: string; value: string } => fact.value !== null)
    .slice(0, 3);
}

export function EventSummary({
  compact = false,
  event,
  showTransaction = true,
}: {
  compact?: boolean;
  event: EventLike;
  showTransaction?: boolean;
}) {
  const body = parseEventBody(event.body);
  const from = event.source ?? textValue(bodyValue(body, "from"));
  const to = event.destination ?? textValue(bodyValue(body, "to"));
  const amount = event.amount ?? numberValue(bodyValue(body, "amount"));
  const facts = compact ? [] : bodyFacts(body);
  const hash = eventTransactionHash(event);
  const rawBody = body ? JSON.stringify(body, null, 2) : null;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium font-mono text-foreground text-xs">{eventLabel(event)}</span>
        {event.log_id === undefined ? null : (
          <span className="tabular text-[10px] text-muted">log {formatInteger(event.log_id)}</span>
        )}
        {amount !== undefined && amount > 0 ? (
          <span className="tabular text-[11px] text-foreground">{formatQu(amount)}</span>
        ) : null}
      </div>

      {from || to ? (
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
          {from ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="text-muted">from</span>
              <IdentityLink identity={from} />
            </span>
          ) : null}
          {from && to ? <ArrowRightIcon className="size-3 shrink-0 text-muted" /> : null}
          {to ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="text-muted">to</span>
              <IdentityLink identity={to} />
            </span>
          ) : null}
        </div>
      ) : null}

      {facts.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          {facts.map((fact) => (
            <span key={fact.label}>
              {fact.label} <span className="text-foreground">{fact.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {compact ? null : (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
          {showTransaction && hash ? <TransactionLink hash={hash} /> : null}
          {event.tick === undefined ? null : (
            <span className="inline-flex items-center gap-1">
              tick <TickLink tick={event.tick} />
            </span>
          )}
          {event.timestamp ? (
            <span title={formatTimestamp(event.timestamp)}>
              {formatRelativeTime(event.timestamp)}
            </span>
          ) : null}
        </div>
      )}

      {rawBody && !compact ? (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-[10px] text-muted transition-colors hover:text-foreground">
            Decoded body
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-surface-secondary p-3 font-mono text-[10px] text-muted leading-5">
            {rawBody}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
