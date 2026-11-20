export type ProfileKind = "wallet" | "exchange";

export type ProfileVerification = "wallet" | "curated";

export type ProfileChallengeAction = "claim" | "revoke";

/** Public profile metadata. Never include email addresses or other private data. */
export type PublicProfile = {
  identity: string;
  displayName: string;
  bio: string;
  website?: string;
  kind: ProfileKind;
  verification: ProfileVerification;
  source: "wallet" | "qubic-exchanges";
  verifiedAt: number;
  updatedAt: number;
};

export type ProfileInput = {
  displayName: string;
  bio: string;
  website?: string;
};

export type ProfileChallenge = {
  id: string;
  identity: string;
  action: ProfileChallengeAction;
  message: string;
  expiresAt: number;
};

export type ProfileResponse = {
  profile: PublicProfile | null;
};

export type ProfileChallengeResponse = {
  challenge: ProfileChallenge;
};

export type ProfileApiError = {
  error: string;
  code:
    | "invalid_request"
    | "invalid_identity"
    | "invalid_signature"
    | "challenge_expired"
    | "challenge_used"
    | "challenge_not_found"
    | "exchange_identity"
    | "profile_unavailable"
    | "origin_not_allowed"
    | "rate_limited";
};
