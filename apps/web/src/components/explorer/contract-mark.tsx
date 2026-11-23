"use client";

import type { ComponentType, CSSProperties } from "react";

import {
  ArrowsRotateRight,
  Briefcase,
  ChartLine,
  CircleDollar,
  Code,
  CreditCard,
  CrownDiamond,
  Dice1,
  Eye,
  FileCheck,
  FileText,
  Flame,
  Gift,
  HeartPulse,
  House,
  Key,
  Link,
  Lock,
  PaperPlane,
  Person,
  Puzzle,
  Receipt,
  Rocket,
  ShoppingBag,
  Star,
  Target,
  Ticket,
  Wallet,
} from "@gravity-ui/icons";

import { classNames } from "@/lib/format";

type ContractMarkIcon = ComponentType<{
  className?: string;
  style?: CSSProperties;
}>;
type ContractMarkDefinition = { color: string; Icon: ContractMarkIcon };

const CONTRACT_MARKS = {
  CCF: { color: "#10b981", Icon: Wallet },
  ESCROW: { color: "#14b8a6", Icon: Briefcase },
  GQMPROP: { color: "#6366f1", Icon: FileText },
  MLM: { color: "#ec4899", Icon: Puzzle },
  MSVAULT: { color: "#64748b", Icon: Key },
  NOST: { color: "#a855f7", Icon: FileCheck },
  PULSE: { color: "#f43f5e", Icon: HeartPulse },
  QBAY: { color: "#e11d48", Icon: ShoppingBag },
  QBOND: { color: "#22c55e", Icon: Receipt },
  QDRAW: { color: "#f97316", Icon: Ticket },
  QDUEL: { color: "#f43f5e", Icon: Target },
  QEARN: { color: "#eab308", Icon: CircleDollar },
  QIP: { color: "#ef4444", Icon: Rocket },
  QPAYHUB: { color: "#06b6d4", Icon: CreditCard },
  QPUMP: { color: "#22c55e", Icon: Rocket },
  QRAFFLE: { color: "#d946ef", Icon: Gift },
  QRP: { color: "#14b8a6", Icon: Briefcase },
  QRWA: { color: "#0ea5e9", Icon: House },
  QSWAP: { color: "#06b6d4", Icon: ArrowsRotateRight },
  QTF: { color: "#f59e0b", Icon: Ticket },
  QTREAT: { color: "#d97706", Icon: CrownDiamond },
  QUOTTERY: { color: "#f97316", Icon: Ticket },
  QUSINO: { color: "#8b5cf6", Icon: Puzzle },
  QUTIL: { color: "#0ea5e9", Icon: PaperPlane },
  QVAULT: { color: "#3b82f6", Icon: Lock },
  QX: { color: "#f59e0b", Icon: ChartLine },
  RANDOM: { color: "#8b5cf6", Icon: Dice1 },
  RL: { color: "#ec4899", Icon: Star },
  SWATCH: { color: "#14b8a6", Icon: Eye },
  VOTTUNBRIDGE: { color: "#6366f1", Icon: Link },
  WOLFPACK: { color: "#64748b", Icon: Person },
} satisfies Record<string, ContractMarkDefinition>;

const FALLBACK_MARK: ContractMarkDefinition = { color: "#64748b", Icon: Code };

/** Semantic contract artwork, with a neutral code icon for unmapped names. */
export function ContractMark({
  className,
  name,
  size = 18,
}: {
  className?: string;
  name: string;
  size?: number;
}) {
  const key = (name || "contract").toUpperCase();
  const mark = CONTRACT_MARKS[key as keyof typeof CONTRACT_MARKS] ?? FALLBACK_MARK;

  return (
    <span
      aria-hidden
      className={classNames("inline-flex shrink-0 items-center justify-center", className)}
      style={{
        color: mark.color,
        height: size,
        width: size,
      }}
    >
      <mark.Icon style={{ height: size, width: size }} />
    </span>
  );
}

export function BurnMark({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger ring-1 ring-danger/20"
      style={{ height: size, width: size }}
    >
      <Flame className="size-3" />
    </span>
  );
}
