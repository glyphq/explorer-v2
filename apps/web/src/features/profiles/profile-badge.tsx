import { Chip } from "@heroui/react";
import { CheckCircleIcon } from "@solar-icons/react/linear/check-circle";
import { DiplomaVerifiedIcon } from "@solar-icons/react/linear/diploma-verified";
import type { ReactNode } from "react";

import type { PublicProfile } from "@/lib/profiles/types";

import { formatProfileDate } from "./profile-format";

export function ProfileVerificationBadge({
  profile,
  showDate = true,
}: {
  profile: PublicProfile;
  showDate?: boolean;
}) {
  const isWallet = profile.verification === "wallet";
  let meta: ReactNode = <span className="text-muted text-xs">Curated by Qubic</span>;
  if (isWallet) {
    meta = showDate ? (
      <span className="text-muted text-xs">Verified {formatProfileDate(profile.verifiedAt)}</span>
    ) : null;
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <Chip color={isWallet ? "success" : "default"} size="sm" variant="soft">
        <span className="inline-flex items-center gap-1.5">
          {isWallet ? (
            <CheckCircleIcon className="size-3.5" />
          ) : (
            <DiplomaVerifiedIcon className="size-3.5" />
          )}
          {isWallet ? "Wallet-verified" : "Exchange"}
        </span>
      </Chip>
      {meta}
    </span>
  );
}
