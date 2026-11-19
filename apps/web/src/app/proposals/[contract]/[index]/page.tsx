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

export const dynamic = "force-dynamic";

type ProposalPageProps = {
  params: Promise<{ contract: string; index: string }>;
};

const loadProposal = cache(async (contract: string, index: number) =>
  getProposalByRoute(contract, index),
);

function parseIndex(value: string): number | null {
  const index = Number.parseInt(value, 10);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function stripLeadingHeading(content: string): string {
  const stripped = content.replace(/^\uFEFF?\s*#\s+[^\n]+\n+/, "").trim();
  return stripped || content.trim();
}

export async function generateMetadata({ params }: ProposalPageProps): Promise<Metadata> {
  const { contract, index: rawIndex } = await params;
  const index = parseIndex(rawIndex);
  const proposal = index === null ? undefined : await loadProposal(contract, index);
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
  const index = parseIndex(rawIndex);
  const proposal = index === null ? undefined : await loadProposal(contract, index);
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
        <article className="min-w-0 max-w-3xl">
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

        <aside className="order-first space-y-6 lg:order-last lg:sticky lg:top-24">
          <div className="rounded-2xl bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-medium text-foreground text-sm">Votes</h2>
              <span className="text-muted text-xs">{countLabel(proposal.totalVotes, "vote")}</span>
            </div>
            <div className="mt-5">
              <OptionBars proposal={proposal} size="md" />
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-5">
            <h2 className="font-medium text-foreground text-sm">Details</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted">Contract</dt>
                <dd>
                  <Link
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                    href={`/contracts/${ticker.toLowerCase()}`}
                  >
                    <ContractMark name={ticker} size={12} />
                    {ticker}
                  </Link>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted">Proposal</dt>
                <dd className="tabular">#{formatInteger(proposal.proposalIndex)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted">Epoch</dt>
                <dd>
                  <EpochLink epoch={proposal.epoch} />
                </dd>
              </div>
              {proposal.publishedTick === undefined ? null : (
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted">Created</dt>
                  <dd>
                    <TickLink tick={proposal.publishedTick} />
                  </dd>
                </div>
              )}
              {proposal.transferAmount ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted">Amount</dt>
                  <dd className="tabular">{formatInteger(Number(proposal.transferAmount))} QU</dd>
                </div>
              ) : null}
              {proposal.transferDestinationIdentity ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted">Destination</dt>
                  <dd className="min-w-0 text-right">
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
