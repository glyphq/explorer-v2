"use client";

import { useId } from "react";

type IconComponent = React.ComponentType<{ className?: string }>;

export function MaskedIcon({ className, icon: Icon }: { className?: string; icon: IconComponent }) {
  const uid = useId().replaceAll(":", "");
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
        <mask height="24" id={maskId} maskUnits="userSpaceOnUse" width="24" x="0" y="0">
          <g style={{ color: "white" }}>
            <Icon className="size-full" />
          </g>
        </mask>
      </defs>
      <rect fill="currentColor" height="24" mask={`url(#${maskId})`} opacity={0.18} width="24" />
    </svg>
  );
}
