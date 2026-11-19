import { ArrowLeftIcon } from "@solar-icons/react/linear/arrow-left";
import { ArrowRightIcon } from "@solar-icons/react/linear/arrow-right";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import type { Metadata } from "next";
import Link from "next/link";

import { ContractMark } from "@/components/explorer/contract-mark";
import { EpochLink, IdentityLink, TickLink } from "@/components/explorer/links";
import { PageHeader, SectionHeading } from "@/components/explorer/page-header";
import {
  contractTicker,
  OptionBars,
  proposalHref,
  statusMeta,
} from "@/components/explorer/proposal-summary";
import { countLabel, formatInteger } from "@/lib/format";
import { getProposals, type Proposal } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  description:
    "Computor votes on Qubic General Quorum Proposals and Computor Controlled Fund requests.",
  title: "Proposals",
};

const EPOCHS_PER_PAGE = 10;

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
        <ArrowRightIcon className="size-3.5 shrink-0 text-muted/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
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

function Pager({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 pt-6">
      {page > 1 ? (
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface-secondary"
          href={{ pathname: "/proposals", query: { page: page - 1 } }}
          scroll={false}
        >
          <ArrowLeftIcon className="size-3.5" />
          Newer epochs
        </Link>
      ) : null}
      {page < totalPages ? (
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface-secondary"
          href={{ pathname: "/proposals", query: { page: page + 1 } }}
          scroll={false}
        >
          Older epochs
          <ArrowRightIcon className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [proposals, params] = await Promise.all([getProposals(), searchParams]);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const decidedGroups = groupByEpoch(proposals.ended);
  const totalPages = Math.max(1, Math.ceil(decidedGroups.length / EPOCHS_PER_PAGE));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const pageGroups = decidedGroups.slice((page - 1) * EPOCHS_PER_PAGE, page * EPOCHS_PER_PAGE);

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        actions={
          <>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
              href="/contracts/gqmprop"
            >
              <ContractMark name="GQMPROP" size={16} />
              GQMPROP
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
              href="/contracts/ccf"
            >
              <ContractMark name="CCF" size={16} />
              CCF
            </Link>
          </>
        }
        description="Computor votes on General Quorum Proposals and Computor Controlled Fund requests, read from the GQMPROP and CCF contracts."
        title="Proposals"
      />

      <div className="mb-6 flex flex-wrap gap-2 text-muted text-xs">
        <span className="rounded-full bg-surface-secondary px-3 py-1.5">
          {countLabel(proposals.active.length, "open proposal")}
        </span>
        <span className="rounded-full bg-surface-secondary px-3 py-1.5">
          {countLabel(proposals.ended.length, "decided proposal")}
        </span>
      </div>

      <section>
        <SectionHeading
          description="Proposals currently collecting computor votes."
          title="Open voting"
        />
        {proposals.active.length === 0 ? (
          <EmptyProposals>No proposals are open for computor voting right now.</EmptyProposals>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {proposals.active.map((proposal) => (
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
                    {group.proposals.length > 1 ? (
                      <span className="text-[11px] text-muted">
                        {countLabel(group.proposals.length, "proposal")}
                      </span>
                    ) : null}
                  </div>
                  <div className="overflow-hidden rounded-2xl bg-surface">
                    {group.proposals.map((proposal) => (
                      <ProposalRow key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Pager page={page} totalPages={totalPages} />
          </>
        )}
      </section>
    </div>
  );
}
