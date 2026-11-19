import type { Route } from "next";

import { formatInteger } from "@/lib/format";
import type { Proposal } from "@/lib/proposals";

const STATUS_META: Record<number, { barClassName: string; chipClassName: string; label: string }> =
  {
    0: {
      barClassName: "bg-foreground/20",
      chipClassName: "bg-surface-secondary text-muted",
      label: "Draft",
    },
    1: {
      barClassName: "bg-foreground/20",
      chipClassName: "bg-surface-secondary text-muted",
      label: "Publishing",
    },
    2: {
      barClassName: "bg-foreground/20",
      chipClassName: "bg-accent/12 text-accent",
      label: "Voting",
    },
    3: {
      barClassName: "bg-success",
      chipClassName: "bg-success/12 text-success",
      label: "Passed",
    },
    4: {
      barClassName: "bg-danger",
      chipClassName: "bg-danger/12 text-danger",
      label: "Failed",
    },
    5: {
      barClassName: "bg-foreground/20",
      chipClassName: "bg-surface-secondary text-muted",
      label: "Cancelled",
    },
    6: {
      barClassName: "bg-danger",
      chipClassName: "bg-danger/12 text-danger",
      label: "Rejected",
    },
    7: {
      barClassName: "bg-foreground/20",
      chipClassName: "bg-surface-secondary text-muted",
      label: "Inconclusive",
    },
  };

export function statusMeta(status: number) {
  return (
    STATUS_META[status] ?? {
      barClassName: "bg-foreground/20",
      chipClassName: "bg-surface-secondary text-muted",
      label: "Unknown",
    }
  );
}

export function contractTicker(proposal: Proposal): string {
  if (proposal.contractIndex === 6) {
    return "GQMPROP";
  }
  if (proposal.contractIndex === 8) {
    return "CCF";
  }
  return proposal.contractName;
}

export function proposalHref(proposal: Proposal): Route {
  return `/proposals/${contractTicker(proposal).toLowerCase()}/${proposal.proposalIndex}` as Route;
}

export function StatusChip({ status }: { status: number }) {
  const meta = statusMeta(status);
  return (
    <span className={`rounded-full px-2.5 py-1 font-medium text-[10px] ${meta.chipClassName}`}>
      {meta.label}
    </span>
  );
}

export function OptionBars({ proposal, size = "sm" }: { proposal: Proposal; size?: "sm" | "md" }) {
  const options = proposal.options;
  if (options.length === 0) {
    return <p className="text-muted text-xs">No vote breakdown is available.</p>;
  }

  const total =
    proposal.totalVotes || options.reduce((sum, option) => sum + option.numberOfVotes, 0);
  const winningVotes = Math.max(...options.map((option) => option.numberOfVotes));
  const decided = proposal.status !== 2;
  const large = size === "md";

  return (
    <div className={large ? "space-y-4" : "space-y-3"}>
      {options.map((option) => {
        const share = total > 0 ? (option.numberOfVotes / total) * 100 : 0;
        const winner = decided && winningVotes > 0 && option.numberOfVotes === winningVotes;
        return (
          <div key={option.index}>
            <div
              className={`flex items-baseline justify-between gap-4 ${
                large ? "text-xs" : "text-[11px]"
              }`}
            >
              <span className="min-w-0 break-words text-foreground">{option.label}</span>
              <span className="shrink-0 tabular text-muted">
                {formatInteger(option.numberOfVotes)} · {Math.round(share)}%
              </span>
            </div>
            <div
              className={`mt-1.5 overflow-hidden rounded-full bg-surface-secondary ${
                large ? "h-2" : "h-1.5"
              }`}
            >
              <div
                className={
                  winner
                    ? "h-full rounded-full bg-foreground"
                    : "h-full rounded-full bg-foreground/25"
                }
                style={{ width: `${Math.max(share, option.numberOfVotes > 0 ? 1 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
