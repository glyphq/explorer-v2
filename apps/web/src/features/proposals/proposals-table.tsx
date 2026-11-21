import Link from "next/link";

import {
  ActivityTable,
  ActivityTableHead,
  ActivityTableRow,
  ActivityTableSkeleton,
  type ActivityTableSkeletonColumn,
} from "@/components/explorer/activity-table";
import { ContractMark } from "@/components/explorer/contract-mark";
import { EpochLink } from "@/components/explorer/links";
import { contractTicker, proposalHref, StatusChip } from "@/components/explorer/proposal-summary";
import type { Proposal } from "@/lib/proposals";
import { formatInteger } from "@/lib/format";

const SKELETON_COLUMNS: ActivityTableSkeletonColumn[] = [
  { barClassName: "w-48", header: "Proposal", width: "w-[44%]" },
  { barClassName: "w-16", header: "Contract", width: "w-[12%]" },
  { barClassName: "w-10", header: "Epoch", width: "w-[8%]" },
  { align: "right", barClassName: "w-24", header: "Votes", width: "w-[27%]" },
  { align: "right", barClassName: "w-6", header: "Status", width: "w-[9%]" },
];

function voteCounts(proposal: Proposal) {
  let no = 0;
  let yes = 0;
  for (const option of proposal.options) {
    const label = option.label.trim().toLowerCase();
    if (label === "no" || label.startsWith("no ")) {
      no += option.numberOfVotes;
    } else {
      yes += option.numberOfVotes;
    }
  }

  return {
    hasBreakdown: proposal.options.length > 0,
    no,
    total:
      proposal.totalVotes ||
      proposal.options.reduce((sum, option) => sum + option.numberOfVotes, 0),
    yes,
  };
}

function ProposalRow({ proposal }: { proposal: Proposal }) {
  const votes = voteCounts(proposal);
  const ticker = contractTicker(proposal);
  const yesShare = votes.total > 0 ? (votes.yes / votes.total) * 100 : 0;
  const noShare = votes.total > 0 ? (votes.no / votes.total) * 100 : 0;

  return (
    <ActivityTableRow>
      <td className="px-3 py-3">
        <Link
          className="block font-medium text-foreground text-sm transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
          href={proposalHref(proposal)}
          prefetch={false}
          title={proposal.title}
        >
          <span className="line-clamp-2">{proposal.title}</span>
        </Link>
      </td>
      <td className="px-3 py-3">
        <Link
          className="relative z-10 inline-flex max-w-full items-center gap-1.5 text-muted text-xs transition-colors hover:text-foreground"
          href={`/contracts/${ticker.toLowerCase()}`}
        >
          <ContractMark name={ticker} size={14} />
          <span className="truncate">{ticker}</span>
        </Link>
      </td>
      <td className="px-3 py-3">
        <EpochLink className="relative z-10" epoch={proposal.epoch} />
      </td>
      <td className="px-3 py-3 text-right">
        <div
          className="ml-auto w-full max-w-[240px]"
          title={
            votes.hasBreakdown
              ? `${formatInteger(votes.total)} votes: ${formatInteger(votes.yes)} yes, ${formatInteger(votes.no)} no`
              : `${formatInteger(votes.total)} votes`
          }
        >
          <span className="block text-center text-foreground text-xs tabular-nums">
            {formatInteger(votes.total)}
          </span>
          <span
            aria-hidden
            className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-surface-secondary"
          >
            {votes.hasBreakdown ? (
              <>
                <span className="h-full bg-success" style={{ width: `${yesShare}%` }} />
                <span className="h-full bg-danger" style={{ width: `${noShare}%` }} />
              </>
            ) : null}
          </span>
          {votes.hasBreakdown ? (
            <span className="mt-1 flex items-baseline justify-between text-[10px] text-muted tabular-nums">
              <span>{formatInteger(votes.yes)} yes</span>
              <span>{formatInteger(votes.no)} no</span>
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <StatusChip status={proposal.status} />
      </td>
    </ActivityTableRow>
  );
}

function ProposalsTable({ proposals }: { proposals: Proposal[] }) {
  return (
    <ActivityTable label="Proposals" minWidth="min-w-[1040px]">
      <ActivityTableHead>
        <th className="w-[44%] px-4 py-3 font-normal">Proposal</th>
        <th className="w-[12%] px-3 py-3 font-normal">Contract</th>
        <th className="w-[8%] px-3 py-3 font-normal">Epoch</th>
        <th className="w-[27%] px-3 py-3 text-right font-normal">Votes</th>
        <th className="w-[9%] px-4 py-3 text-right font-normal">Status</th>
      </ActivityTableHead>
      <tbody>
        {proposals.map((proposal) => (
          <ProposalRow key={proposal.id} proposal={proposal} />
        ))}
      </tbody>
    </ActivityTable>
  );
}

function ProposalsTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <ActivityTableSkeleton
      columns={SKELETON_COLUMNS}
      label="Loading proposals"
      minWidth="min-w-[1040px]"
      rows={rows}
    />
  );
}

export { ProposalsTable, ProposalsTableSkeleton };
