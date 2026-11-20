"use client";

import { ArrowLeftIcon } from "@solar-icons/react/linear/arrow-left";
import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CcfTreasuryStrip } from "@/components/explorer/ccf-treasury-strip";
import { ContractMark } from "@/components/explorer/contract-mark";
import { EpochLink, IdentityLink, TickLink } from "@/components/explorer/links";
import { SectionHeading } from "@/components/explorer/page-header";
import {
  contractTicker,
  OptionBars,
  proposalHref,
  statusMeta,
} from "@/components/explorer/proposal-summary";
import { ErrorState } from "@/components/explorer/state";
import { readProposals } from "@/features/proposals/data";
import type { CcfTreasury } from "@/lib/ccf-treasury";
import { countLabel, formatInteger } from "@/lib/format";
import type { Proposal } from "@/lib/proposals";

const EPOCHS_PER_PAGE = 10;

async function readTreasury(signal: AbortSignal) {
  const response = await fetch("/api/ccf-treasury", { signal });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { treasury?: CcfTreasury };
  return body.treasury ?? null;
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const status = statusMeta(proposal.status);

  return (
    <article className="flex min-w-0 overflow-hidden rounded-2xl bg-surface">
      <span aria-hidden className={`w-5 shrink-0 ${status.barClassName}`} title={status.label} />
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <span className="sr-only">{status.label}</span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-2.5 py-1 text-[10px] text-muted transition-colors hover:text-foreground"
              href={`/contracts/${contractTicker(proposal).toLowerCase()}`}
            >
              <ContractMark name={contractTicker(proposal)} size={12} />
              {contractTicker(proposal)}
            </Link>
            <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[10px] text-muted">
              Epoch <EpochLink epoch={proposal.epoch} />
            </span>
          </div>
          {proposal.url ? (
            <a
              aria-label="Open proposal document"
              className="text-muted transition-colors hover:text-foreground"
              href={proposal.url}
              rel="noreferrer"
              target="_blank"
            >
              <ArrowRightUpIcon className="size-3.5" />
            </a>
          ) : null}
        </div>

        <h2 className="mt-4 text-balance font-medium text-base text-foreground leading-snug">
          <Link
            className="decoration-foreground/25 underline-offset-4 transition-colors hover:underline"
            href={proposalHref(proposal)}
            prefetch={false}
          >
            {proposal.title}
          </Link>
        </h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted text-xs">
          <span>{proposal.proposalType}</span>
          <span>Proposal #{formatInteger(proposal.proposalIndex)}</span>
          {proposal.proposerIdentity ? (
            <span>
              by <IdentityLink identity={proposal.proposerIdentity} />
            </span>
          ) : null}
        </p>

        <div className="mt-5">
          <OptionBars proposal={proposal} />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-5 text-[10px] text-muted">
          <span>{countLabel(proposal.totalVotes, "vote")}</span>
          {proposal.publishedTick === undefined ? null : (
            <span>
              created at <TickLink tick={proposal.publishedTick} />
            </span>
          )}
          {proposal.transferDestinationIdentity ? (
            <span className="min-w-0 truncate">
              to <IdentityLink identity={proposal.transferDestinationIdentity} />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function voteLabel(label: string): string {
  if (label.startsWith("Send ")) {
    return "send";
  }
  if (label === "No transfer") {
    return "no";
  }
  return label.toLowerCase();
}

function ProposalRow({ proposal }: { proposal: Proposal }) {
  const total =
    proposal.totalVotes || proposal.options.reduce((sum, option) => sum + option.numberOfVotes, 0);
  const breakdown = proposal.options
    .map((option) => `${option.label}: ${formatInteger(option.numberOfVotes)}`)
    .join(" · ");
  const status = statusMeta(proposal.status);
  const winnerIndex = status.label === "Passed" ? 1 : status.label === "Rejected" ? 0 : undefined;
  const voteBar = (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
      {proposal.options.map((option) => {
        const share = total > 0 ? (option.numberOfVotes / total) * 100 : 0;
        const tone =
          winnerIndex === undefined
            ? "bg-foreground/20"
            : option.index === winnerIndex
              ? status.label === "Passed"
                ? "bg-success"
                : "bg-danger"
              : "bg-foreground/15";
        return (
          <div
            className={`h-full ${tone}`}
            key={option.index}
            style={{
              minWidth: option.numberOfVotes > 0 ? "2px" : undefined,
              width: `${share}%`,
            }}
          />
        );
      })}
    </div>
  );
  const voteCounts = proposal.options.map((option) => (
    <span key={option.index}>
      {formatInteger(option.numberOfVotes)} {voteLabel(option.label)}
    </span>
  ));

  return (
    <Link
      className="group flex items-stretch transition-colors hover:bg-surface-secondary"
      href={proposalHref(proposal)}
      prefetch={false}
    >
      <span aria-hidden className={`w-5 shrink-0 ${status.barClassName}`} title={status.label} />
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
        <span className="sr-only">{status.label}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground text-sm decoration-foreground/30 underline-offset-4 group-hover:underline">
            {proposal.title}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <ContractMark name={contractTicker(proposal)} size={11} />
              {contractTicker(proposal)}
            </span>
            <span>Proposal #{formatInteger(proposal.proposalIndex)}</span>
            <span>{proposal.proposalType}</span>
          </p>
          <div
            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 md:hidden"
            title={breakdown}
          >
            <div className="w-24 shrink-0">{voteBar}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted tabular">
              {voteCounts}
            </div>
          </div>
        </div>
        <div className="hidden w-44 shrink-0 flex-col gap-1.5 md:flex" title={breakdown}>
          {voteBar}
          <div className="flex justify-between gap-2 text-[10px] text-muted tabular">
            {voteCounts}
          </div>
        </div>
        <span className="hidden w-16 shrink-0 text-right text-[11px] text-muted tabular sm:block">
          {countLabel(total, "vote")}
        </span>
      </div>
    </Link>
  );
}

function groupByEpoch(proposals: Proposal[]): { epoch: number; proposals: Proposal[] }[] {
  const groups = new Map<number, Proposal[]>();
  for (const proposal of proposals) {
    const group = groups.get(proposal.epoch);
    if (group) {
      group.push(proposal);
    } else {
      groups.set(proposal.epoch, [proposal]);
    }
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right - left)
    .map(([epoch, items]) => ({ epoch, proposals: items }));
}

function EmptyProposals({ children }: { children: string }) {
  return (
    <div className="rounded-2xl bg-surface px-6 py-6 text-center text-muted text-sm">
      {children}
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 pt-6">
      {page > 1 ? (
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface-secondary"
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ArrowLeftIcon className="size-3.5" />
          Newer epochs
        </button>
      ) : null}
      {page < totalPages ? (
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface-secondary"
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Older epochs
          <ArrowRightIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function ProposalsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="flex gap-2">
        <div className="h-7 w-32 animate-pulse rounded-full bg-surface-secondary" />
        <div className="h-7 w-32 animate-pulse rounded-full bg-surface-secondary" />
      </div>
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-secondary" />
        <div className="h-52 animate-pulse rounded-2xl bg-surface" />
      </div>
      <div className="space-y-4 pt-4">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-surface-secondary" />
        <div className="h-96 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}

export function ProposalsExplorer() {
  const proposalsQuery = useQuery({
    queryFn: ({ signal }) => readProposals(signal),
    queryKey: ["proposals"],
    staleTime: 30_000,
  });
  const treasuryQuery = useQuery({
    queryFn: ({ signal }) => readTreasury(signal),
    queryKey: ["ccf-treasury"],
    staleTime: 60_000,
  });
  const [page, setPage] = useState(1);

  const data = proposalsQuery.data;
  const decidedGroups = useMemo(() => groupByEpoch(data?.ended ?? []), [data?.ended]);
  const totalPages = Math.max(1, Math.ceil(decidedGroups.length / EPOCHS_PER_PAGE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageGroups = decidedGroups.slice(
    (currentPage - 1) * EPOCHS_PER_PAGE,
    currentPage * EPOCHS_PER_PAGE,
  );
  const treasury = treasuryQuery.data;

  if (proposalsQuery.isPending) {
    return <ProposalsSkeleton />;
  }

  if (proposalsQuery.isError || !data) {
    return (
      <ErrorState
        message={proposalsQuery.error?.message}
        onRetry={() => {
          proposalsQuery.refetch().catch(() => undefined);
          treasuryQuery.refetch().catch(() => undefined);
        }}
      />
    );
  }

  return (
    <>
      {treasury ? <CcfTreasuryStrip treasury={treasury} /> : null}

      <div className="mb-6 flex flex-wrap gap-2 text-muted text-xs">
        <span className="rounded-full bg-surface-secondary px-3 py-1.5">
          {countLabel(data.active.length, "open proposal")}
        </span>
        <span className="rounded-full bg-surface-secondary px-3 py-1.5">
          {countLabel(data.ended.length, "decided proposal")}
        </span>
      </div>

      <section>
        <SectionHeading
          description="Proposals currently collecting computor votes."
          title="Open voting"
        />
        {data.active.length === 0 ? (
          <EmptyProposals>No proposals are open for computor voting right now.</EmptyProposals>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.active.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </section>

      <section className="pt-10">
        <SectionHeading
          description="Proposals whose voting period has closed, grouped by the epoch they were published in."
          title="Decided"
        />
        {decidedGroups.length === 0 ? (
          <EmptyProposals>No decided proposals are available.</EmptyProposals>
        ) : (
          <>
            <div className="space-y-9">
              {pageGroups.map((group) => (
                <div key={group.epoch}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium text-foreground text-sm">
                      Epoch <EpochLink epoch={group.epoch} />
                    </h3>
                  </div>
                  <div className="overflow-hidden rounded-2xl bg-surface">
                    {group.proposals.map((proposal) => (
                      <ProposalRow key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Pager page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </section>
    </>
  );
}
