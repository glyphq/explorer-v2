"use client";

import Avatar from "boring-avatars";

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
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10"
      style={{ height: size, width: size }}
    >
      <Avatar colors={COLORS} name={value || "unknown"} size={size} variant={variant} />
    </span>
  );
}
