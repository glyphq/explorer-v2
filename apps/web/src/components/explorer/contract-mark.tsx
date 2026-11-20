"use client";

import Avatar from "boring-avatars";
import { FireIcon } from "@solar-icons/react/linear/fire";

import { classNames } from "@/lib/format";

const CONTRACT_COLORS = ["#fb7185", "#fbbf24", "#34d399", "#38bdf8", "#a78bfa", "#f472b6"];

export function ContractMark({
  className,
  name,
  size = 18,
}: {
  className?: string;
  name: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={classNames(
        "inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10",
        className,
      )}
      style={{ height: size, width: size }}
    >
      <Avatar colors={CONTRACT_COLORS} name={name || "contract"} size={size} variant="abstract" />
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

export function ZeroMark({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-foreground/5 font-mono text-[9px] text-muted ring-1 ring-foreground/10"
      style={{ fontSize: Math.max(9, Math.round(size * 0.28)), height: size, width: size }}
    >
      0
    </span>
  );
}
