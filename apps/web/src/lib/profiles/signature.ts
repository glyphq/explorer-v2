import { identityToPublicKey, k12, verify } from "@qubic.org/crypto";
import type { Identity } from "@qubic.org/crypto";

const SIGNATURE_BYTES = 64;
const SIGNATURE_HEX_LENGTH = SIGNATURE_BYTES * 2;
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

/**
 * Qubic Wallet's WalletConnect signer prefixes user messages before signing.
 * Other connectors sign the raw UTF-8 message, so both forms are accepted.
 */
export const QUBIC_SIGNED_MESSAGE_PREFIX = "Qubic Signed Message:\n";

/** Converts a validated hex string to bytes. */
export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0 || (normalized.length > 0 && !HEX_PATTERN.test(normalized))) {
    throw new Error("Invalid hex string");
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Converts bytes to a lowercase hex string. */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Normalizes a SchnorrQ signature into lowercase hex.
 * Returns null unless the value is exactly a 64-byte hex string.
 */
export function normalizeSignatureHex(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const hex = trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed.slice(2) : trimmed;

  if (hex.length !== SIGNATURE_HEX_LENGTH || !HEX_PATTERN.test(hex)) return null;
  return hex.toLowerCase();
}

/**
 * Verifies a SchnorrQ signature over the exact challenge message.
 * The challenge digest is k12(UTF-8(message), 32).
 */
export function verifyChallengeSignature(
  message: string,
  signatureHex: string,
  identity: string,
  options?: { allowQubicMessagePrefix?: boolean },
): boolean {
  if (typeof message !== "string" || typeof identity !== "string") return false;

  const normalized = normalizeSignatureHex(signatureHex);
  if (normalized === null) return false;

  try {
    const publicKey = identityToPublicKey(identity as Identity);
    const signature = hexToBytes(normalized);
    const messages = options?.allowQubicMessagePrefix
      ? [message, `${QUBIC_SIGNED_MESSAGE_PREFIX}${message}`]
      : [message];

    return messages.some((value) => {
      const digest = k12(new TextEncoder().encode(value), 32);
      return verify(digest, signature, publicKey);
    });
  } catch {
    return false;
  }
}
