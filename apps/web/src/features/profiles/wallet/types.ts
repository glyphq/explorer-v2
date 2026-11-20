export type ProfileWalletKind = "glyph" | "extension" | "walletconnect";

export type ProfileWalletAccount = {
  identity: string;
  label: string;
  kind: ProfileWalletKind;
};

export type GlyphReadiness = "idle" | "preparing" | "ready" | "error";

export type ProfileWalletAvailability = Record<ProfileWalletKind, boolean>;

export type ProfileWalletSignature = {
  identity: string;
  signatureHex: string;
};

/**
 * Shared wallet boundary for profile claims.
 *
 * Glyph Wallet is the primary connector and is reached through the relay. The
 * browser extension and WalletConnect are fallbacks. Every signature is over
 * the exact challenge message text returned by the API.
 */
export type ProfileWalletApi = {
  account: ProfileWalletAccount | null;
  kind: ProfileWalletKind | null;
  isConnecting: boolean;
  error: string | null;
  walletConnectUri: string | null;
  glyphReadiness: GlyphReadiness;
  glyphError: string | null;
  availability: ProfileWalletAvailability;
  connect: (kind: ProfileWalletKind, preferredIdentity?: string) => Promise<ProfileWalletAccount>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<ProfileWalletSignature>;
  prepareGlyph: () => void;
  clearError: () => void;
};
