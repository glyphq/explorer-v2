import type { Route } from "next";
import type { ComponentType } from "react";

import { CheckCircleIcon } from "@solar-icons/react/linear/check-circle";
import { ClockCircleIcon } from "@solar-icons/react/linear/clock-circle";
import { CloseIcon } from "@solar-icons/react/linear/close";
import { CloseCircleIcon } from "@solar-icons/react/linear/close-circle";
import { DocumentAddIcon } from "@solar-icons/react/linear/document-add";
import { MinusCircleIcon } from "@solar-icons/react/linear/minus-circle";
import { QuestionCircleIcon } from "@solar-icons/react/linear/question-circle";
import { ShieldCrossIcon } from "@solar-icons/react/linear/shield-cross";
import { UploadSquareIcon } from "@solar-icons/react/linear/upload-square";
import { formatInteger } from "@/lib/format";
import type { Proposal } from "@/lib/proposals";

type StatusIcon = ComponentType<{ className?: string }>;
type StatusMeta = {
  barClassName: string;
  chipClassName: string;
  Icon: StatusIcon;
  label: string;
};

const STATUS_META: Record<number, StatusMeta> = {
  0: {
    barClassName: "bg-foreground/20",
    chipClassName: "bg-surface-secondary text-muted",
    Icon: DocumentAddIcon,
    label: "Draft",
  },
  1: {
    barClassName: "bg-foreground/20",
    chipClassName: "bg-surface-secondary text-muted",
    Icon: UploadSquareIcon,
    label: "Publishing",
  },
  2: {
    barClassName: "bg-foreground/20",
    chipClassName: "bg-accent/12 text-accent",
    Icon: ClockCircleIcon,
    label: "Voting",
  },
  3: {
    barClassName: "bg-success",
    chipClassName: "bg-success/12 text-success",
    Icon: CheckCircleIcon,
    label: "Passed",
  },
  4: {
    barClassName: "bg-danger",
    chipClassName: "bg-danger/12 text-danger",
    Icon: CloseCircleIcon,
    label: "Failed",
  },
  5: {
    barClassName: "bg-foreground/20",
    chipClassName: "bg-surface-secondary text-muted",
    Icon: MinusCircleIcon,
    label: "Cancelled",
  },
  6: {
    barClassName: "bg-danger",
    chipClassName: "bg-danger/12 text-danger",
    Icon: ShieldCrossIcon,
    label: "Rejected",
  },
  7: {
    barClassName: "bg-foreground/20",
    chipClassName: "bg-surface-secondary text-muted",
    Icon: CloseIcon,
    label: "No quorum",
  },
};

export function statusMeta(status: number) {
  return (
    STATUS_META[status] ?? {
      barClassName: "bg-foreground/20",
      chipClassName: "bg-surface-secondary text-muted",
      Icon: QuestionCircleIcon,
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
  const contract = contractTicker(proposal).toLowerCase();
  const index = encodeURIComponent(String(proposal.slug ?? proposal.proposalIndex));
  return `/proposals/view?contract=${contract}&index=${index}` as Route;
}

export function StatusChip({ status }: { status: number }) {
  const meta = statusMeta(status);
  const Icon = meta.Icon;
  return (
    <span
      aria-label={meta.label}
      className={`inline-flex size-6 items-center justify-center rounded-full ${meta.chipClassName}`}
      role="img"
      title={meta.label}
    >
      <Icon className="size-3.5 shrink-0" />
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
  const decided = proposal.status === 3 || proposal.status === 4 || proposal.status === 6;
  const winnerClassName =
    proposal.status === 3
      ? "bg-success"
      : proposal.status === 4 || proposal.status === 6
        ? "bg-danger"
        : "bg-foreground";
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
                className={`h-full rounded-full ${winner ? winnerClassName : "bg-foreground/25"}`}
                style={{ width: `${Math.max(share, option.numberOfVotes > 0 ? 1 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
