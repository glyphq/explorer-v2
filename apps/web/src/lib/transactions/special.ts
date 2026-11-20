import { formatInteger, shorten } from "@/lib/format";

export * from "./special-hash";

export type DecodedField = {
  label: string;
  title?: string;
  value: string;
};

export type DecodedSpecialInput = {
  fields: DecodedField[];
  note?: string;
};

function hexToBytes(value: string | undefined): Uint8Array | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/^0x/i, "");
  if (normalized.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(normalized)) {
    return null;
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readUint16(bytes: Uint8Array, offset: number): number | undefined {
  if (offset + 2 > bytes.length) {
    return undefined;
  }
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number | undefined {
  if (offset + 4 > bytes.length) {
    return undefined;
  }
  return (
    (bytes[offset]! |
      (bytes[offset + 1]! << 8) |
      (bytes[offset + 2]! << 16) |
      (bytes[offset + 3]! << 24)) >>>
    0
  );
}

function readBigUint64(bytes: Uint8Array, offset: number): bigint | undefined {
  if (offset + 8 > bytes.length) {
    return undefined;
  }
  let value = BigInt(0);
  for (let index = 7; index >= 0; index -= 1) {
    value = (value << BigInt(8)) | BigInt(bytes[offset + index]!);
  }
  return value;
}

function formatUint64(value: bigint | undefined): string {
  if (value === undefined) {
    return "—";
  }
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? formatInteger(Number(value)) : value.toString();
}

function ascii(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) {
    if (byte === 0) {
      break;
    }
    value += String.fromCharCode(byte);
  }
  return value;
}

function digestField(label: string, bytes: Uint8Array, offset: number): DecodedField {
  const digest = bytesToHex(bytes.subarray(offset, offset + 32));
  return { label, title: digest, value: shorten(digest, 12, 10) };
}

function bytesField(label: string, count: number): DecodedField {
  return { label, value: `${formatInteger(count)} bytes` };
}

function unknownFields(bytes: Uint8Array): DecodedField[] {
  return [bytesField("Payload", bytes.length)];
}

export function decodeSpecialInput(
  inputType: number,
  inputData: string | undefined,
): DecodedSpecialInput {
  const bytes = hexToBytes(inputData);
  if (!bytes) {
    return { fields: [], note: "The input payload is empty or is not valid hex." };
  }

  if (inputType === 12) {
    const parentTick = readUint32(bytes, 0);
    const parentIndex = readUint32(bytes, 4);
    const anchorTick = readUint32(bytes, 8);
    const claimedScore = readUint32(bytes, 12);
    const nonce = bytesToHex(bytes.subarray(16, 48));
    return {
      fields: [
        { label: "Parent tick", value: formatInteger(parentTick) },
        { label: "Parent solution", value: formatInteger(parentIndex) },
        { label: "Anchor tick", value: formatInteger(anchorTick) },
        { label: "Claimed score", value: formatInteger(claimedScore) },
        { label: "Nonce", title: nonce, value: shorten(nonce, 12, 10) },
      ],
      note: "The attached deposit is returned when the solution is accepted and the claimed score matches the score recomputed by the nodes.",
    };
  }

  if (inputType === 2) {
    const miningSeed = bytesToHex(bytes.subarray(0, 32));
    const nonce = bytesToHex(bytes.subarray(32, 64));
    return {
      fields: [
        { label: "Mining seed", title: miningSeed, value: shorten(miningSeed, 12, 10) },
        { label: "Nonce", title: nonce, value: shorten(nonce, 12, 10) },
        { label: "Claimed score", value: formatInteger(readUint32(bytes, 64)) },
        { label: "Reserved", value: formatInteger(readUint32(bytes, 68)) },
      ],
    };
  }

  if (inputType === 3) {
    return {
      fields: [
        { label: "File size", value: formatUint64(readBigUint64(bytes, 0)) },
        { label: "Fragments", value: formatUint64(readBigUint64(bytes, 8)) },
        { label: "Format", value: ascii(bytes.subarray(16, 24)) || "—" },
      ],
    };
  }

  if (inputType === 4) {
    return {
      fields: [
        { label: "Fragment index", value: formatUint64(readBigUint64(bytes, 0)) },
        digestField("Previous digest", bytes, 8),
      ],
    };
  }

  if (inputType === 5) {
    return {
      fields: [
        { label: "File size", value: formatUint64(readBigUint64(bytes, 0)) },
        { label: "Fragments", value: formatUint64(readBigUint64(bytes, 8)) },
        { label: "Format", value: ascii(bytes.subarray(16, 24)) || "—" },
        digestField("Last fragment digest", bytes, 24),
      ],
    };
  }

  if (inputType === 6) {
    return {
      fields: [
        { label: "Replies", value: formatInteger(Math.floor(bytes.length / 72)) },
        { label: "First query ID", value: formatUint64(readBigUint64(bytes, 0)) },
        { label: "Payload", value: `${formatInteger(bytes.length)} bytes` },
      ],
    };
  }

  if (inputType === 7) {
    return {
      fields: [
        { label: "Query ID", value: formatUint64(readBigUint64(bytes, 0)) },
        bytesField("Reply payload", Math.max(0, bytes.length - 8)),
      ],
    };
  }

  if (inputType === 9) {
    return {
      fields: [
        { label: "Phase", value: formatInteger(readUint32(bytes, 0)) },
        { label: "Contract entries", value: formatInteger(readUint32(bytes, 4)) },
        bytesField("Payload", bytes.length),
      ],
    };
  }

  if (inputType === 10) {
    return {
      fields: [
        { label: "Oracle interface", value: formatInteger(readUint32(bytes, 0)) },
        { label: "Timeout", value: `${formatInteger(readUint32(bytes, 4))} ms` },
        bytesField("Query payload", Math.max(0, bytes.length - 8)),
      ],
    };
  }

  if (inputType === 11) {
    return {
      fields: [bytesField("Packed shares", bytes.length)],
      note: "Doge mining share accounting is a computor-only protocol payload.",
    };
  }

  if (inputType === 13) {
    const itemCount = readUint16(bytes, 0);
    return {
      fields: [
        { label: "Authorizations", value: formatInteger(itemCount) },
        { label: "Payload", value: `${formatInteger(bytes.length)} bytes` },
      ],
    };
  }

  if (inputType === 1) {
    return {
      fields: [bytesField("Vote payload", bytes.length)],
      note: "Compressed computor votes are a protocol payload and are not user data.",
    };
  }

  return {
    fields: unknownFields(bytes),
  };
}

export type AntSolutionResult = {
  accepted: boolean;
  code: number;
  label: string;
  refunded: boolean;
  tone: "danger" | "muted" | "success";
};

const ANT_SOLUTION_RESULTS: Array<Omit<AntSolutionResult, "code" | "tone">> = [
  { accepted: true, label: "Valid", refunded: true },
  { accepted: true, label: "Valid (not stored)", refunded: true },
  { accepted: false, label: "Parent not registered", refunded: false },
  { accepted: false, label: "Stale anchor", refunded: false },
  { accepted: false, label: "Wrong tree", refunded: false },
  { accepted: false, label: "Below threshold", refunded: false },
  { accepted: false, label: "Did not beat parent", refunded: false },
  { accepted: false, label: "Parent child limit", refunded: false },
  { accepted: false, label: "Tick out of range", refunded: false },
  { accepted: false, label: "Replay", refunded: false },
  { accepted: false, label: "Dedup store full", refunded: false },
  { accepted: false, label: "Miner index full", refunded: false },
  { accepted: false, label: "Non-canonical nonce", refunded: false },
  { accepted: false, label: "Superseded in tick", refunded: true },
];

export function antSolutionResult(code: number): AntSolutionResult {
  const known = ANT_SOLUTION_RESULTS[code];
  if (known) {
    return {
      ...known,
      code,
      tone: known.accepted ? "success" : known.refunded ? "muted" : "danger",
    };
  }
  return {
    accepted: false,
    code,
    label: `Unknown result ${code}`,
    refunded: false,
    tone: "muted",
  };
}

export type CustomMessage = {
  fields: DecodedField[];
  label: string;
  sourcePublicKey?: string;
  status?: {
    label: string;
    tone: "danger" | "muted" | "success";
  };
};

const CUSTOM_MESSAGE_LABELS: Record<string, string> = {
  ANT_SOLU: "Ant colony solution",
  END_DDIV: "Dividend distribution ended",
  END_EPOC: "Epoch ended",
  STA_DDIV: "Dividend distribution started",
  STA_EPOC: "Epoch started",
};

/** Decode the compact custom-message payloads emitted by Qubic core. */
export function decodeCustomMessage(inputData: string | undefined): CustomMessage | null {
  if (!inputData) {
    return null;
  }

  const normalized = inputData.replace(/^0x/i, "");
  if (normalized.length < 16 || normalized.length % 2 !== 0) {
    return null;
  }

  const codeBytes = hexToBytes(normalized.slice(0, 16));
  if (!codeBytes) {
    return null;
  }

  const code = ascii(codeBytes);
  const label = CUSTOM_MESSAGE_LABELS[code];
  if (!label) {
    return null;
  }

  if (code !== "ANT_SOLU") {
    return { fields: [], label };
  }
  if (normalized.length < 184) {
    return { fields: [], label };
  }

  const bytes = hexToBytes(normalized);
  if (!bytes) {
    return { fields: [], label };
  }

  const sourcePublicKey = bytesToHex(bytes.subarray(8, 40));
  const nonce = bytesToHex(bytes.subarray(40, 72));
  const parentTick = readUint32(bytes, 72);
  const parentIndex = readUint32(bytes, 76);
  const anchorTick = readUint32(bytes, 80);
  const score = readUint32(bytes, 84);
  const resultCode = readUint32(bytes, 88);
  const result = resultCode === undefined ? null : antSolutionResult(resultCode);

  return {
    fields: [
      { label: "Parent tick", value: formatInteger(parentTick) },
      { label: "Parent solution", value: formatInteger(parentIndex) },
      { label: "Anchor tick", value: formatInteger(anchorTick) },
      { label: "Score", value: formatInteger(score) },
      { label: "Nonce", title: nonce, value: shorten(nonce, 10, 8) },
    ],
    label,
    sourcePublicKey,
    status: result
      ? {
          label: result.label,
          tone: result.tone,
        }
      : undefined,
  };
}
