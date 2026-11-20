export const ZERO_IDENTITY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB";

export function isZeroIdentity(identity: string | null | undefined): boolean {
  return identity?.toUpperCase() === ZERO_IDENTITY;
}

/**
 * Qubic core reserves the transaction indexes after the per-tick transaction slots for
 * system procedures. `NUMBER_OF_TRANSACTIONS_PER_TICK` is 4096 in the protocol.
 */
export const SPECIAL_SLOT_BASE = 4096;

const SYSTEM_SLOTS = [
  {
    description: "Contract initialization procedure.",
    label: "INITIALIZE",
  },
  {
    description: "Start-of-epoch system procedure.",
    label: "BEGIN_EPOCH",
  },
  {
    description: "Start-of-tick system procedure.",
    label: "BEGIN_TICK",
  },
  {
    description:
      "End-of-tick system procedure. Contract maintenance, distribution, and protocol bookkeeping events are recorded here.",
    label: "END_TICK",
  },
  {
    description: "End-of-epoch system procedure.",
    label: "END_EPOCH",
  },
  {
    description: "Asynchronous contract notification.",
    label: "NOTIFICATION",
  },
] as const;

const NAMED_SLOTS = new Map<string, number>(
  SYSTEM_SLOTS.map((slot, index) => [slot.label, SPECIAL_SLOT_BASE + index] as const),
);

export type SpecialSlot = {
  description: string;
  displayLabel: string;
  label: string;
  slot: number;
};

export function specialSlot(slot: number): SpecialSlot {
  const index = slot - SPECIAL_SLOT_BASE;
  const known = index >= 0 && index < SYSTEM_SLOTS.length ? SYSTEM_SLOTS[index] : undefined;
  if (known) {
    return {
      description: known.description,
      displayLabel: `[${known.label}]`,
      label: known.label,
      slot,
    };
  }

  return {
    description: "Protocol-level system event recorded outside the normal transaction slots.",
    displayLabel: `special:${slot}`,
    label: `SPECIAL_${slot}`,
    slot,
  };
}

export type SpecialTransactionRef = SpecialSlot & {
  hash: string;
  tick: number;
};

function decodeUri(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function slotNumber(token: string): number | null {
  const normalized = token.replaceAll("[", "").replaceAll("]", "").trim().toUpperCase();
  if (/^-?\d+$/.test(normalized)) {
    const parsed = Number(normalized);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return NAMED_SLOTS.get(normalized) ?? null;
}

/** Parse a synthetic system hash such as `special:92023284:4099` or `special:92023284:END_TICK`. */
export function parseSpecialHash(value: string | null | undefined): SpecialTransactionRef | null {
  if (!value) {
    return null;
  }

  const match = /^special:(\d+):([a-z0-9_\-[\]]+)$/i.exec(decodeUri(value).trim());
  if (!match) {
    return null;
  }

  const tick = Number(match[1]);
  const slot = slotNumber(match[2] ?? "");
  if (!Number.isSafeInteger(tick) || tick <= 0 || slot === null || slot < SPECIAL_SLOT_BASE) {
    return null;
  }

  return {
    ...specialSlot(slot),
    hash: `special:${tick}:${slot}`,
    tick,
  };
}

export type SpecialTransactionType = {
  description: string;
  inputType: number;
  label: string;
};

const SPECIAL_TRANSACTION_TYPES: Record<number, Omit<SpecialTransactionType, "inputType">> = {
  1: {
    description: "Computor vote aggregation for the quorum vote counter.",
    label: "Vote counter",
  },
  2: {
    description: "Legacy Qubic mining solution submission.",
    label: "Mining solution",
  },
  3: {
    description: "First fragment of a file published to the Qubic network.",
    label: "File header",
  },
  4: {
    description: "A fragment of a file published to the Qubic network.",
    label: "File fragment",
  },
  5: {
    description: "Final fragment of a file published to the Qubic network.",
    label: "File trailer",
  },
  6: {
    description: "Computor commit for one or more oracle replies.",
    label: "Oracle reply commit",
  },
  7: {
    description: "Computor reveal of an oracle reply.",
    label: "Oracle reply reveal",
  },
  9: {
    description: "Computor report of contract execution fees.",
    label: "Execution fee report",
  },
  10: {
    description: "User query sent to an oracle interface.",
    label: "Oracle query",
  },
  11: {
    description: "Doge mining share accounting submitted by a computor.",
    label: "Doge mining share",
  },
  12: {
    description:
      "Ant colony mining solution submitted by a computor. The attached deposit is refunded when the solution is accepted and its claimed score matches the node's recompute.",
    label: "Ant colony solution",
  },
  13: {
    description: "Computor authorization for an outsourced computation invocation.",
    label: "OC authorization",
  },
};

export function specialTransactionType(inputType: number): SpecialTransactionType {
  const known = SPECIAL_TRANSACTION_TYPES[inputType];
  if (known) {
    return { ...known, inputType };
  }

  return {
    description:
      "Protocol transaction handled by Qubic core. Its payload does not match a known special transaction type.",
    inputType,
    label: "System transaction",
  };
}
