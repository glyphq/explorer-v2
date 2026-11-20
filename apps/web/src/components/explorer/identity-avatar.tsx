"use client";

import Avatar from "boring-avatars";

import { exchangeIconForIdentity, exchangeNameForIdentity } from "@/lib/exchanges/brands";

const COLORS = ["#f3b8c6", "#f6c9a8", "#f3e3a3", "#bfe3bd", "#a9dbe8", "#c4c7ee", "#e5c3e3"];

export function IdentityAvatar({
  size = 18,
  value,
  variant = "marble",
}: {
  size?: number;
  value: string;
  variant?: "marble" | "pixel" | "geometric" | "abstract" | "ring" | "beam";
}) {
  const exchangeIcon = exchangeIconForIdentity(value);
  const exchangeName = exchangeNameForIdentity(value);

  if (exchangeIcon && exchangeName) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-secondary ring-1 ring-foreground/10"
        style={{ height: size, padding: Math.max(1, Math.round(size * 0.08)), width: size }}
        title={exchangeName}
      >
        <img alt="" className="h-full w-full object-contain" src={exchangeIcon} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10"
      style={{ height: size, width: size }}
    >
      <Avatar colors={COLORS} name={value || "unknown"} size={size} variant={variant} />
    </span>
  );
}
