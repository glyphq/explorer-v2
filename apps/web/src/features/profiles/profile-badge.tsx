import { CheckCircleIcon } from "@solar-icons/react/linear/check-circle";
import { DiplomaVerifiedIcon } from "@solar-icons/react/linear/diploma-verified";

import type { PublicProfile } from "@/lib/profiles/types";
import { classNames } from "@/lib/format";

export function ProfileVerificationBadge({ profile }: { profile: PublicProfile }) {
  const isWallet = profile.verification === "wallet";
  const label = isWallet ? "Wallet verified" : "Curated by Qubic";

  return (
    <span
      aria-label={label}
      className={classNames(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
        isWallet ? "bg-success/15 text-success" : "bg-surface-tertiary text-muted",
      )}
      role="img"
    >
      {isWallet ? (
        <CheckCircleIcon className="size-4" />
      ) : (
        <DiplomaVerifiedIcon className="size-4" />
      )}
    </span>
  );
}
