import type { Identity } from "@qubic.org/crypto";
import { identityToPublicKey, publicKeyToIdentity } from "@qubic.org/crypto";

/** Validates a Qubic identity, including its checksum and round trip. */
export function isValidWalletIdentity(value: unknown): value is string {
  if (typeof value !== "string" || value.length !== 60) {
    return false;
  }
  try {
    const publicKey = identityToPublicKey(value as Identity);
    return publicKeyToIdentity(publicKey) === value;
  } catch {
    return false;
  }
}

/** Extracts the unique Qubic identities from WalletConnect account strings. */
export function walletConnectIdentities(accounts: string[] | undefined): string[] {
  const identities: string[] = [];
  for (const account of accounts ?? []) {
    const identity = account.split(":").at(-1);
    if (identity && isValidWalletIdentity(identity) && !identities.includes(identity)) {
      identities.push(identity);
    }
  }
  return identities;
}

/**
 * Picks the account requested by the page when the wallet exposes several
 * accounts, otherwise falls back to the first account in the session.
 */
export function selectWalletConnectIdentity(
  accounts: string[] | undefined,
  preferredIdentity?: string,
): string | null {
  const identities = walletConnectIdentities(accounts);
  if (preferredIdentity && identities.includes(preferredIdentity)) {
    return preferredIdentity;
  }
  return identities[0] ?? null;
}
