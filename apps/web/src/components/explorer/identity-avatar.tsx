"use client";

import Avatar from "boring-avatars";

const COLORS = ["#f5f5f5", "#d4d4d4", "#a3a3a3", "#525252", "#171717"];

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
      className="inline-flex shrink-0 overflow-hidden rounded-[4px] ring-1 ring-foreground/10"
      style={{ height: size, width: size }}
    >
      <Avatar colors={COLORS} name={value || "unknown"} size={size} square variant={variant} />
    </span>
  );
}
