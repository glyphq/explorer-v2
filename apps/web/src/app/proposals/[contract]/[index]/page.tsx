import { ArrowLeftIcon } from "@solar-icons/react/linear/arrow-left";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import { DocumentTextIcon } from "@solar-icons/react/linear/document-text";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ContractMark } from "@/components/explorer/contract-mark";
import { EpochLink, IdentityLink, TickLink } from "@/components/explorer/links";
import { ProposalMarkdown } from "@/components/explorer/proposal-markdown";
import { contractTicker, OptionBars, StatusChip } from "@/components/explorer/proposal-summary";
import { countLabel, formatInteger } from "@/lib/format";
import { getProposalDocument } from "@/lib/proposal-content";
import { getProposalByRoute } from "@/lib/proposals";

export const revalidate = 300;

type ProposalPageProps = {
  params: Promise<{ contract: string; index: string }>;
};

const loadProposal = cache(async (contract: string, route: string) =>
  getProposalByRoute(contract, route),
);

function stripLeadingHeading(content: string): string {
  let rest = content;
  while (/^\uFEFF?\s*#\s*(?:\n|$)/.test(rest)) {
    rest = rest.replace(/^\uFEFF?\s*#\s*\n+/, "");
  }
  const stripped = rest.replace(/^\uFEFF?\s*#\s+[^\n]+\n+/, "").trim();
  return stripped || content.trim();
}

export async function generateMetadata({ params }: ProposalPageProps): Promise<Metadata> {
  const { contract, index: rawIndex } = await params;
  const proposal = await loadProposal(contract, rawIndex);
  if (!proposal) {
    return { title: "Proposal not found" };
  }
  return {
    description: `${proposal.proposalType} proposal #${proposal.proposalIndex} for epoch ${proposal.epoch}.`,
    title: proposal.title,
  };
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { contract, index: rawIndex } = await params;
  const proposal = await loadProposal(contract, rawIndex);
  if (!proposal) {
    notFound();
  }

  const document = await getProposalDocument(proposal.url);
  const ticker = contractTicker(proposal);
  const content =
    "content" in document
      ? document.format === "markdown"
        ? stripLeadingHeading(document.content)
        : document.content
      : null;
  const unavailable = "reason" in document;

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <Link
        className="inline-flex items-center gap-1.5 text-muted text-xs transition-colors hover:text-foreground"
        href="/proposals"
      >
        <ArrowLeftIcon className="size-3.5" />
        Proposals
      </Link>

      <div className="mt-5 flex flex-col gap-6 pb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip status={proposal.status} />
            <Link
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-2.5 py-1 text-[10px] text-muted transition-colors hover:text-foreground"
              href={`/contracts/${ticker.toLowerCase()}`}
            >
              <ContractMark name={ticker} size={12} />
              {ticker}
            </Link>
            <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[10px] text-muted">
              Epoch <EpochLink epoch={proposal.epoch} />
            </span>
          </div>
          <h1 className="mt-4 max-w-4xl text-balance font-semibold text-2xl text-foreground leading-tight tracking-tight md:text-3xl">
            {proposal.title}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted text-xs">
            <span>{proposal.proposalType}</span>
            <span>Proposal #{formatInteger(proposal.proposalIndex)}</span>
            {proposal.publishedTick === undefined ? null : (
              <span>
                Created at <TickLink tick={proposal.publishedTick} />
              </span>
            )}
          </p>
        </div>
        {proposal.url ? (
          <a
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
            href={proposal.url}
            rel="noreferrer"
            target="_blank"
          >
            Original document
            <ArrowRightUpIcon className="size-3.5" />
          </a>
        ) : null}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <article className="min-w-0">
          {unavailable ? (
            <div className="rounded-2xl bg-surface px-6 py-12 text-center">
              <span className="inline-flex rounded-full bg-surface-secondary p-3 text-muted">
                <DocumentTextIcon className="size-5" />
              </span>
              <h2 className="mt-4 font-medium text-foreground text-sm">
                {document.sourceUrl ? "Document removed" : "No document attached"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted text-xs leading-5">
                {document.sourceUrl
                  ? "The author may have deleted this document or made it private. The proposal and its on-chain vote record are still preserved here."
                  : "This proposal was published on-chain without an off-chain document."}
              </p>
              {document.sourceUrl ? (
                <a
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
                  href={document.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Check original URL
                  <ArrowRightUpIcon className="size-3.5" />
                </a>
              ) : null}
            </div>
          ) : "content" in document && document.format === "markdown" ? (
            <ProposalMarkdown content={content ?? ""} sourceUrl={document.sourceUrl} />
          ) : (
            <div className="proposal-text">{content ?? ""}</div>
          )}
        </article>

        <aside className="order-first lg:sticky lg:top-6 lg:order-last lg:h-fit lg:self-start">
          <div className="rounded-2xl bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium text-foreground text-sm">Votes</h2>
              <StatusChip status={proposal.status} />
            </div>
            <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted">
              <span>{countLabel(proposal.totalVotes, "vote")}</span>
              <span className="text-muted/70">Quorum 451</span>
            </p>
            <div className="mt-5">
              <OptionBars proposal={proposal} size="md" />
            </div>

            <h3 className="mt-6 font-medium text-[10px] text-muted uppercase tracking-[0.14em]">
              Details
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
              <div>
                <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">Epoch</dt>
                <dd className="mt-1">
                  <EpochLink epoch={proposal.epoch} />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">Proposal</dt>
                <dd className="mt-1 tabular">#{formatInteger(proposal.proposalIndex)}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">Contract</dt>
                <dd className="mt-1">
                  <Link
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                    href={`/contracts/${ticker.toLowerCase()}`}
                  >
                    <ContractMark name={ticker} size={12} />
                    {ticker}
                  </Link>
                </dd>
              </div>
              {proposal.publishedTick === undefined ? null : (
                <div>
                  <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">Created</dt>
                  <dd className="mt-1">
                    <TickLink tick={proposal.publishedTick} />
                  </dd>
                </div>
              )}
              {proposal.transferAmount ? (
                <div className="col-span-2">
                  <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">Amount</dt>
                  <dd className="mt-1 tabular">
                    {formatInteger(Number(proposal.transferAmount))} QU
                  </dd>
                </div>
              ) : null}
              {proposal.transferDestinationIdentity ? (
                <div className="col-span-2">
                  <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">
                    Destination
                  </dt>
                  <dd className="mt-1 min-w-0">
                    <IdentityLink identity={proposal.transferDestinationIdentity} />
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
