"use client";

import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";
import { AsciiSkeleton } from "ascii-reveal";
import type { ReactNode } from "react";

import { EventSummary } from "@/components/explorer/event-summary";
import { IdentityAvatar } from "@/components/explorer/identity-avatar";
import { CopyableId, CopyButton, IdentityLink, TickLink } from "@/components/explorer/links";
import { ProfileHero } from "@/components/explorer/profile-hero";
import { RecordEmpty, RecordList, RecordRow } from "@/components/explorer/records";
import { SectionCard } from "@/components/explorer/section-card";
import { ErrorState } from "@/components/explorer/state";
import type { TransactionEffect } from "@/lib/api/generated/types.gen";
import { useTransaction, useTransactionEffects, useTransactionStatus } from "@/lib/api/hooks";
import { countLabel, formatInteger, formatQu, formatTimestamp, shorten } from "@/lib/format";

type StatusBody = {
  hash?: string;
  indexed?: unknown;
  network?: { found?: boolean } & Record<string, unknown>;
  tick?: number;
};

function Field({ children, label, mono }: { children: ReactNode; label: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd
        className={
          mono
            ? "mt-1 break-words font-mono text-foreground text-xs"
            : "mt-1 break-words text-foreground text-sm"
        }
      >
        {children}
      </dd>
    </div>
  );
}

function EffectRow({ effect }: { effect: TransactionEffect }) {
  const kind = effect.kind.replaceAll("_", " ");
  const hasParticipants = effect.from || effect.to;
  const facts = [
    effect.contract_index === undefined ? null : `contract ${effect.contract_index}`,
    effect.op_code ? `op ${effect.op_code}` : null,
    effect.message_type === undefined ? null : `message ${effect.message_type}`,
    effect.name,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <RecordRow>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium font-mono text-foreground text-xs">{kind}</span>
        <span className="tabular text-[10px] text-muted">log {formatInteger(effect.log_id)}</span>
      </div>
      {hasParticipants ? (
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
          {effect.from ? <IdentityLink avatar identity={effect.from} /> : null}
          {effect.from && effect.to ? (
            <ArrowRightIcon className="size-3 shrink-0 text-muted" />
          ) : null}
          {effect.to ? <IdentityLink avatar identity={effect.to} /> : null}
        </div>
      ) : null}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        {effect.amount !== undefined && effect.amount > 0 ? (
          <span className="tabular text-foreground text-xs">{formatQu(effect.amount)}</span>
        ) : null}
        {effect.shares === undefined ? null : (
          <span className="tabular text-foreground text-xs">
            {formatInteger(effect.shares)} shares
          </span>
        )}
        {facts.map((fact) => (
          <span key={fact}>{fact}</span>
        ))}
      </div>
      {effect.data ? (
        <p className="mt-1.5 break-all font-mono text-[10px] text-muted">
          {shorten(effect.data, 54, 18)}
        </p>
      ) : null}
    </RecordRow>
  );
}

export function TransactionDetail({ hash }: { hash: string }) {
  const transaction = useTransaction(hash);
  const effects = useTransactionEffects(hash);
  const status = useTransactionStatus(hash);
  const data = transaction.data?.data;
  const effectsData = effects.data?.data;
  const statusBody = (status.data as { data?: StatusBody } | undefined)?.data;
  const networkFound = statusBody?.network?.found;
  const effectCount = effectsData?.effects.length ?? 0;
  const eventCount = effectsData?.events.length ?? 0;
  const failed = data?.status !== undefined && data.status !== "success";

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      {transaction.isError ? (
        <ErrorState message={transaction.error.message} onRetry={() => transaction.refetch()} />
      ) : (
        <div className="space-y-4">
          <ProfileHero
            avatar={<IdentityAvatar size={56} value={hash} variant="pixel" />}
            meta={
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted text-xs">
                <span className={failed ? "text-danger" : "text-foreground"}>
                  {data?.status ?? "unknown"}
                </span>
                <span>
                  tick <TickLink tick={data?.tick} />
                </span>
                <span>epoch {formatInteger(data?.epoch)}</span>
                <span>
                  {countLabel(effectCount, "effect")} · {countLabel(eventCount, "event")}
                </span>
                <span title={formatTimestamp(data?.timestamp)}>
                  {formatTimestamp(data?.timestamp)}
                </span>
              </div>
            }
            subtitle={<CopyableId value={hash} />}
            title="Transaction"
            value={
              transaction.isLoading ? (
                <AsciiSkeleton className="text-4xl sm:text-5xl" lines={1} widths={["8ch"]} />
              ) : (
                formatQu(data?.amount)
              )
            }
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div className="min-w-0 rounded-xl bg-surface-secondary p-3">
                <p className="text-[11px] text-muted">From</p>
                <div className="mt-1.5 flex min-w-0 items-center gap-1">
                  <IdentityLink avatar identity={data?.source ?? ""} />
                  <CopyButton label="Copy source identity" value={data?.source ?? ""} />
                </div>
              </div>
              <ArrowRightIcon className="mx-auto hidden size-4 text-muted sm:block" />
              <div className="min-w-0 rounded-xl bg-surface-secondary p-3">
                <p className="text-[11px] text-muted">To</p>
                <div className="mt-1.5 flex min-w-0 items-center gap-1">
                  <IdentityLink avatar identity={data?.destination ?? ""} />
                  <CopyButton label="Copy destination identity" value={data?.destination ?? ""} />
                </div>
              </div>
            </div>
          </ProfileHero>

          <SectionCard title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
              <Field label="Input type" mono>
                {data?.input_type ?? "—"}
              </Field>
              <Field label="Indexed">{statusBody?.indexed ? "yes" : "no"}</Field>
              <Field label="Peer reported">{networkFound ? "yes" : "no"}</Field>
              <Field label="Transaction index" mono>
                {formatInteger(data?.tx_index)}
              </Field>
            </dl>

            {data?.input_data ? (
              <details className="mt-6 rounded-xl bg-surface-secondary p-3">
                <summary className="cursor-pointer font-medium text-foreground text-xs">
                  Raw input data
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-muted leading-5">
                  {data.input_data}
                </pre>
              </details>
            ) : null}
          </SectionCard>

          <SectionCard
            description={
              effectCount === 0
                ? "No effects."
                : `${formatInteger(effectCount)} ${effectCount === 1 ? "effect" : "effects"}`
            }
            title="Effects"
          >
            {effects.isLoading ? (
              <RecordEmpty>Loading effects…</RecordEmpty>
            ) : effectCount === 0 ? (
              <RecordEmpty>No effects attached to this transaction.</RecordEmpty>
            ) : (
              <RecordList>
                {effectsData?.effects.map((effect) => (
                  <EffectRow effect={effect} key={`${effect.kind}-${effect.log_id}`} />
                ))}
              </RecordList>
            )}
          </SectionCard>

          <SectionCard
            description={
              eventCount === 0
                ? "No events."
                : `${formatInteger(eventCount)} ${eventCount === 1 ? "event" : "events"}`
            }
            title="Events"
          >
            {effects.isLoading ? (
              <RecordEmpty>Loading events…</RecordEmpty>
            ) : eventCount === 0 ? (
              <RecordEmpty>No events attached.</RecordEmpty>
            ) : (
              <RecordList>
                {effectsData?.events.map((event) => (
                  <RecordRow
                    className="scroll-mt-20"
                    key={`${event.log_id ?? event.tx_hash}-${event.tx_index ?? 0}`}
                  >
                    <div id={`log-${event.log_id}`}>
                      <EventSummary event={event} showTransaction={false} />
                    </div>
                  </RecordRow>
                ))}
              </RecordList>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
