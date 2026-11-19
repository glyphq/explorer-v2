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
  StatusChip,
} from "@/components/explorer/proposal-summary";
import { countLabel, formatInteger } from "@/lib/format";
import { getProposals, type Proposal } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  description:
    "Computor votes on Qubic General Quorum Proposals and Computor Controlled Fund requests.",
  title: "Proposals",
};

const PAGE_SIZE = 12;

function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip status={proposal.status} />
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
    </article>
  );
}

function EmptyProposals({ children }: { children: string }) {
  return (
    <div className="rounded-2xl bg-surface px-6 py-10 text-center text-muted text-sm">
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
          Newer
        </Link>
      ) : null}
      {page < totalPages ? (
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface-secondary"
          href={{ pathname: "/proposals", query: { page: page + 1 } }}
          scroll={false}
        >
          Older
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
  const totalPages = Math.max(1, Math.ceil(proposals.ended.length / PAGE_SIZE));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const ended = proposals.ended.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <SectionHeading description="Proposals whose voting period has closed." title="Decided" />
        {proposals.ended.length === 0 ? (
          <EmptyProposals>No decided proposals are available.</EmptyProposals>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {ended.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
            <Pager page={page} totalPages={totalPages} />
          </>
        )}
      </section>
    </div>
  );
}
