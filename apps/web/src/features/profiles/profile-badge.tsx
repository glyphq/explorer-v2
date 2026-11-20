import { CheckCircleIcon } from "@solar-icons/react/linear/check-circle";

import type { PublicProfile } from "@/lib/profiles/types";

export function ProfileVerificationBadge({ profile }: { profile: PublicProfile }) {
  if (profile.verification !== "wallet") {
    return null;
  }

  return (
    <span
      aria-label="Wallet verified"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
      role="img"
    >
      <CheckCircleIcon className="size-4" />
    </span>
  );
}
