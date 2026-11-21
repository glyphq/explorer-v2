"use client";

import { ActorLabel } from "@/components/explorer/actor-label";
import { parseEventBody } from "@/components/explorer/event-summary";
import type { Event } from "@/lib/api/generated/types.gen";
import { formatQu } from "@/lib/format";
import { decodeCustomMessage } from "@/lib/transactions/special";

const EVENT_LABELS: Record<string, string> = {
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

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function EventLine({ event, source }: { event: Event; source?: string }) {
  const body = parseEventBody(event.body);
  const custom = decodeCustomMessage(textValue(body?.raw));
  const status = custom?.status;
  const label =
    custom?.label ??
    EVENT_LABELS[event.type_name ?? ""] ??
    (event.type_name || "event").replaceAll("_", " ");
  const amount = numberValue(body?.amount);
  const from = textValue(body?.from) ?? source;
  const to = textValue(body?.to);
  const statusTone = status?.tone === "danger" ? "text-danger" : "text-muted";
  const isTransfer = event.type_name === "qu_transfer";
  const amountLabel =
    amount !== undefined ? (
      <span className="whitespace-nowrap font-medium text-foreground tabular-nums">
        {formatQu(amount)}
      </span>
    ) : null;

  return (
    <li>
      <p className="text-muted text-xs leading-5">
        {isTransfer ? (
          <>
            Transferred {amountLabel ?? <span className="font-medium text-foreground">QUBIC</span>}
            {from ? (
              <>
                {" "}
                from <ActorLabel identity={from} showAvatar={false} />
              </>
            ) : null}
            {to ? (
              <>
                {" "}
                to <ActorLabel identity={to} showAvatar={false} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{label}</span>
            {status && status.tone !== "success" ? (
              <span className={`font-medium text-[9px] ${statusTone}`}> ({status.label})</span>
            ) : null}
            {amountLabel ? <> · {amountLabel}</> : null}
            {from ? (
              <>
                {" "}
                from <ActorLabel identity={from} showAvatar={false} />
              </>
            ) : null}
            {to ? (
              <>
                {" "}
                to <ActorLabel identity={to} showAvatar={false} />
              </>
            ) : null}
          </>
        )}
      </p>
    </li>
  );
}

export function TransactionEvents({ events, source }: { events: Event[]; source?: string }) {
  return (
    <div className="px-4 pb-3">
      <ul className="ml-6 space-y-2">
        {events.map((event, index) => (
          <EventLine
            event={event}
            key={`${event.log_id ?? event.tx_hash ?? "event"}-${event.tx_index ?? index}`}
            source={source}
          />
        ))}
      </ul>
    </div>
  );
}
