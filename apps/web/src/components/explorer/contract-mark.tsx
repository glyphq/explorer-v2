"use client";

import type { ComponentType, CSSProperties } from "react";

import { BankIcon } from "@solar-icons/react/linear/bank";
import { BillCheckIcon } from "@solar-icons/react/linear/bill-check";
import { Buildings2Icon } from "@solar-icons/react/linear/buildings-2";
import { CardSendIcon } from "@solar-icons/react/linear/card-send";
import { ChartCandlestickIcon } from "@solar-icons/react/linear/chart-candlestick";
import { CodeSquareIcon } from "@solar-icons/react/linear/code-square";
import { CoinsIcon } from "@solar-icons/react/linear/coins";
import { CrownStarIcon } from "@solar-icons/react/linear/crown-star";
import { DiceIcon } from "@solar-icons/react/linear/dice";
import { DocumentTextIcon } from "@solar-icons/react/linear/document-text";
import { EyeIcon } from "@solar-icons/react/linear/eye";
import { FireIcon } from "@solar-icons/react/linear/fire";
import { GamepadIcon } from "@solar-icons/react/linear/gamepad";
import { GamepadOldIcon } from "@solar-icons/react/linear/gamepad-old";
import { GavelIcon } from "@solar-icons/react/linear/gavel";
import { GiftIcon } from "@solar-icons/react/linear/gift";
import { HandShakeIcon } from "@solar-icons/react/linear/hand-shake";
import { HeartPulse2Icon } from "@solar-icons/react/linear/heart-pulse-2";
import { KeyIcon } from "@solar-icons/react/linear/key";
import { LinkCircleIcon } from "@solar-icons/react/linear/link-circle";
import { PawIcon } from "@solar-icons/react/linear/paw";
import { PiggyBankIcon } from "@solar-icons/react/linear/piggy-bank";
import { RefreshIcon } from "@solar-icons/react/linear/refresh";
import { RocketIcon } from "@solar-icons/react/linear/rocket";
import { Rocket2Icon } from "@solar-icons/react/linear/rocket-2";
import { Safe2Icon } from "@solar-icons/react/linear/safe-2";
import { SendTwiceSquareIcon } from "@solar-icons/react/linear/send-twice-square";
import { Shop2Icon } from "@solar-icons/react/linear/shop-2";
import { StarFallIcon } from "@solar-icons/react/linear/star-fall";
import { TargetIcon } from "@solar-icons/react/linear/target";
import { TicketIcon } from "@solar-icons/react/linear/ticket";
import { TicketSaleIcon } from "@solar-icons/react/linear/ticket-sale";
import { TicketStarIcon } from "@solar-icons/react/linear/ticket-star";

import { classNames } from "@/lib/format";

type ContractMarkIcon = ComponentType<{ className?: string; style?: CSSProperties }>;
type ContractMarkDefinition = { color: string; Icon: ContractMarkIcon };

const CONTRACT_MARKS = {
  CCF: { color: "#10b981", Icon: PiggyBankIcon },
  ESCROW: { color: "#14b8a6", Icon: HandShakeIcon },
  GQMPROP: { color: "#6366f1", Icon: DocumentTextIcon },
  MLM: { color: "#ec4899", Icon: GamepadIcon },
  MSVAULT: { color: "#64748b", Icon: KeyIcon },
  NOST: { color: "#a855f7", Icon: GavelIcon },
  PULSE: { color: "#f43f5e", Icon: HeartPulse2Icon },
  QBAY: { color: "#e11d48", Icon: Shop2Icon },
  QBOND: { color: "#22c55e", Icon: BillCheckIcon },
  QDRAW: { color: "#f97316", Icon: TicketStarIcon },
  QDUEL: { color: "#f43f5e", Icon: TargetIcon },
  QEARN: { color: "#eab308", Icon: CoinsIcon },
  QIP: { color: "#ef4444", Icon: RocketIcon },
  QPAYHUB: { color: "#06b6d4", Icon: CardSendIcon },
  QPUMP: { color: "#22c55e", Icon: Rocket2Icon },
  QRAFFLE: { color: "#d946ef", Icon: GiftIcon },
  QRP: { color: "#14b8a6", Icon: BankIcon },
  QRWA: { color: "#0ea5e9", Icon: Buildings2Icon },
  QSWAP: { color: "#06b6d4", Icon: RefreshIcon },
  QTF: { color: "#f59e0b", Icon: TicketSaleIcon },
  QTREAT: { color: "#d97706", Icon: CrownStarIcon },
  QUOTTERY: { color: "#f97316", Icon: TicketIcon },
  QUSINO: { color: "#8b5cf6", Icon: GamepadOldIcon },
  QUTIL: { color: "#0ea5e9", Icon: SendTwiceSquareIcon },
  QVAULT: { color: "#3b82f6", Icon: Safe2Icon },
  QX: { color: "#f59e0b", Icon: ChartCandlestickIcon },
  RANDOM: { color: "#8b5cf6", Icon: DiceIcon },
  RL: { color: "#ec4899", Icon: StarFallIcon },
  SWATCH: { color: "#14b8a6", Icon: EyeIcon },
  VOTTUNBRIDGE: { color: "#6366f1", Icon: LinkCircleIcon },
  WOLFPACK: { color: "#64748b", Icon: PawIcon },
} satisfies Record<string, ContractMarkDefinition>;

const FALLBACK_MARK: ContractMarkDefinition = { color: "#64748b", Icon: CodeSquareIcon };

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
      <FireIcon className="size-3" />
    </span>
  );
}
