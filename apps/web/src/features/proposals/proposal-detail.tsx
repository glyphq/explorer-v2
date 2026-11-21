"use client";

import { ArrowLeftIcon } from "@solar-icons/react/linear/arrow-left";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import { DocumentTextIcon } from "@solar-icons/react/linear/document-text";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo } from "react";

import { ContractMark } from "@/components/explorer/contract-mark";
import { EpochLink, IdentityLink, TickLink } from "@/components/explorer/links";
import { ProposalMarkdown } from "@/components/explorer/proposal-markdown";
import { contractTicker, OptionBars, StatusChip } from "@/components/explorer/proposal-summary";
import { ErrorState } from "@/components/explorer/state";
import { readProposals } from "@/features/proposals/data";
import { countLabel, formatInteger } from "@/lib/format";
import { getProposalDocument, type ProposalDocument } from "@/lib/proposal-content";
import type { Proposal, ProposalSnapshot } from "@/lib/proposals";

function findProposal(snapshot: ProposalSnapshot | undefined, contract: string, route: string) {
  if (!snapshot) {
    return undefined;
  }
  const contractIndex =
    contract.toLowerCase() === "gqmprop" ? 6 : contract.toLowerCase() === "ccf" ? 8 : undefined;
  if (!contractIndex) {
    return undefined;
  }
  return [...snapshot.active, ...snapshot.ended].find(
    (proposal) =>
      proposal.contractIndex === contractIndex &&
      (proposal.slug ? proposal.slug === route : String(proposal.proposalIndex) === route),
  );
}

function stripLeadingHeading(content: string): string {
  let rest = content;
  while (/^\uFEFF?\s*#\s*(?:\n|$)/.test(rest)) {
    rest = rest.replace(/^\uFEFF?\s*#\s*\n+/, "");
  }
  const stripped = rest.replace(/^\uFEFF?\s*#\s+[^\n]+\n+/, "").trim();
  return stripped || content.trim();
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="animate-pulse">
      <div className="flex flex-wrap gap-1.5">
        <div className="h-5 w-16 rounded-full bg-surface-secondary" />
        <div className="h-5 w-24 rounded-full bg-surface-secondary" />
        <div className="h-5 w-24 rounded-full bg-surface-secondary" />
      </div>
      <div className="mt-4 h-9 w-3/4 rounded-lg bg-surface-secondary" />
      <div className="mt-3 h-4 w-1/2 rounded bg-surface-secondary" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="h-[30rem] rounded-2xl bg-surface" />
        <div className="h-80 rounded-2xl bg-surface" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="rounded-2xl bg-surface px-6 py-16 text-center">
      <h2 className="font-medium text-foreground text-sm">Proposal not found</h2>
      <p className="mx-auto mt-2 max-w-md text-muted text-xs leading-5">
        This proposal is not in the current GQMPROP or CCF snapshot.
      </p>
      <Link
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
        href="/proposals"
      >
        Browse proposals
      </Link>
    </div>
  );
}

export function ProposalDetail({
  contract,
  initialProposal,
  route,
}: {
  contract: string;
  initialProposal?: Proposal;
  route: string;
}) {
  const proposalsQuery = useQuery({
    queryFn: ({ signal }) => readProposals(signal),
    queryKey: ["proposals"],
    staleTime: 30_000,
  });
  const fetchedProposal = useMemo(
    () => findProposal(proposalsQuery.data, contract, route),
    [contract, proposalsQuery.data, route],
  );
  const proposal = proposalsQuery.data ? fetchedProposal : initialProposal;
  const documentQuery = useQuery({
    enabled: Boolean(proposal?.url),
    queryFn: () => getProposalDocument(proposal?.url),
    queryKey: ["proposal-document", proposal?.url],
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (proposal) {
      document.title = `${proposal.title} · Glyph Explorer`;
    }
  }, [proposal]);

  const proposalDocument: ProposalDocument | undefined = proposal?.url
    ? documentQuery.data
    : { reason: "This proposal does not reference an off-chain document." };
  const content =
    proposalDocument && "content" in proposalDocument
      ? proposalDocument.format === "markdown"
        ? stripLeadingHeading(proposalDocument.content)
        : proposalDocument.content
      : null;
  const unavailable = proposalDocument && "reason" in proposalDocument;

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <Link
        className="inline-flex items-center gap-1.5 text-muted text-xs transition-colors hover:text-foreground"
        href="/proposals"
      >
        <ArrowLeftIcon className="size-3.5" />
        Proposals
      </Link>

      <div className="mt-5">
        {proposalsQuery.isPending && !proposal ? (
          <DetailSkeleton />
        ) : !proposal && proposalsQuery.isError ? (
          <ErrorState
            message={proposalsQuery.error?.message}
            onRetry={() => proposalsQuery.refetch().catch(() => undefined)}
          />
        ) : !proposal ? (
          <NotFound />
        ) : (
          <>
            <div className="flex flex-col gap-6 pb-8 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
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
                {documentQuery.isPending && proposal.url ? (
                  <div className="h-96 animate-pulse rounded-2xl bg-surface" />
                ) : unavailable ? (
                  <div className="rounded-2xl bg-surface px-6 py-12 text-center">
                    <span className="inline-flex rounded-full bg-surface-secondary p-3 text-muted">
                      <DocumentTextIcon className="size-5" />
                    </span>
                    <h2 className="mt-4 font-medium text-foreground text-sm">
                      {proposalDocument.sourceUrl ? "Document removed" : "No document attached"}
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-muted text-xs leading-5">
                      {proposalDocument.sourceUrl
                        ? "The author may have deleted this document or made it private. The proposal and its on-chain vote record are still preserved here."
                        : "This proposal was published on-chain without an off-chain document."}
                    </p>
                    {proposalDocument.sourceUrl ? (
                      <a
                        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
                        href={proposalDocument.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Check original URL
                        <ArrowRightUpIcon className="size-3.5" />
                      </a>
                    ) : null}
                  </div>
                ) : proposalDocument &&
                  "content" in proposalDocument &&
                  proposalDocument.format === "markdown" ? (
                  <ProposalMarkdown
                    content={content ?? ""}
                    sourceUrl={proposalDocument.sourceUrl}
                  />
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
                      <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">
                        Proposal
                      </dt>
                      <dd className="mt-1 tabular">#{formatInteger(proposal.proposalIndex)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">
                        Contract
                      </dt>
                      <dd className="mt-1">
                        <Link
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                          href={`/contracts/${contractTicker(proposal).toLowerCase()}`}
                        >
                          <ContractMark name={contractTicker(proposal)} size={12} />
                          {contractTicker(proposal)}
                        </Link>
                      </dd>
                    </div>
                    {proposal.publishedTick === undefined ? null : (
                      <div>
                        <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">
                          Created
                        </dt>
                        <dd className="mt-1">
                          <TickLink tick={proposal.publishedTick} />
                        </dd>
                      </div>
                    )}
                    {proposal.transferAmount ? (
                      <div className="col-span-2">
                        <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">
                          Amount
                        </dt>
                        <dd className="mt-1 tabular">
                          {formatInteger(Number(proposal.transferAmount))} QUBIC
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
          </>
        )}
      </div>
    </div>
  );
}
