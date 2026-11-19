"use client";

import { useId } from "react";

type IconComponent = React.ComponentType<{ className?: string }>;

export function MaskedIcon({ className, icon: Icon }: { className?: string; icon: IconComponent }) {
  const uid = useId().replaceAll(":", "");
  const gradientId = `bento-gradient-${uid}`;
  const maskId = `bento-mask-${uid}`;

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1="2"
          x2="22"
          y1="2"
          y2="22"
        >
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <mask height="24" id={maskId} maskUnits="userSpaceOnUse" width="24" x="0" y="0">
          <g style={{ color: "white" }}>
            <Icon className="size-full" />
          </g>
        </mask>
      </defs>
      <rect fill={`url(#${gradientId})`} height="24" mask={`url(#${maskId})`} width="24" />
    </svg>
  );
}
