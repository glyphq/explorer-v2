import type { ContractField } from "@glyph-oss/contracts";

const integerFormatter = new Intl.NumberFormat("en-US");

export function contractFieldType(field: ContractField): string {
  if (field.array) {
    return `${field.array.itemType}[${field.array.length}]`;
  }
  if (field.structRef) {
    return field.structRef.split("::").at(-1) ?? "struct";
  }
  if (field.enumRef) {
    return field.enumRef.split("::").at(-1) ?? "enum";
  }
  return field.type;
}

export function decodeAssetName(value: unknown): string | null {
  if (typeof value !== "bigint" && typeof value !== "number") {
    return null;
  }

  let encoded: bigint;
  try {
    encoded = BigInt(value);
  } catch {
    return null;
  }
  if (encoded <= BigInt(0) || encoded >= BigInt("18446744073709551616")) {
    return null;
  }

  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, encoded, true);
  const end = bytes.indexOf(0);
  const textBytes = bytes.slice(0, end === -1 ? bytes.length : end);
  if (textBytes.length === 0 || textBytes.some((byte) => byte < 32 || byte > 126)) {
    return null;
  }

  return String.fromCharCode(...textBytes);
}

export function formatContractValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "bigint") {
    return integerFormatter.format(value);
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  if (typeof value === "number") {
    return value.toLocaleString("en-US");
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  if (Array.isArray(value)) {
    return value.map(formatContractValue).join(", ");
  }
  return (
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    ) ?? String(value)
  );
}
