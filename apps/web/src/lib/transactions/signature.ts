import { k12, publicKeyToIdentity } from "@qubic.org/crypto";

const HEADER_SIZE = 80;
const SIGNATURE_SIZE = 64;
const RECORD_OVERHEAD = HEADER_SIZE + SIGNATURE_SIZE;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Archived tick sections are concatenated transaction records:
 * source (32) + destination (32) + amount (8) + tick (4) + input type (2) +
 * input size (2) + input + signature (64). The transaction identity is K12-32
 * of the complete record, so we can match a hash and recover its signature.
 * Signatures are 64 raw bytes and are displayed as base64, matching Qubic.
 */
export function findTransactionSignature(data: Uint8Array, hash: string): string | null {
  const target = hash.trim().toLowerCase();
  if (target.length === 0) {
    return null;
  }

  let offset = 0;
  while (offset + RECORD_OVERHEAD <= data.length) {
    const inputSize = data[offset + 78]! | (data[offset + 79]! << 8);
    const recordSize = RECORD_OVERHEAD + inputSize;
    if (offset + recordSize > data.length) {
      return null;
    }

    const record = data.subarray(offset, offset + recordSize);
    if (publicKeyToIdentity(k12(record, 32)).toLowerCase() === target) {
      return toBase64(record.subarray(HEADER_SIZE + inputSize));
    }

    offset += recordSize;
  }

  return null;
}
