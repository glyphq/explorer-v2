"use client";

import { useEffect, useState } from "react";

import { contractFieldType, decodeAssetName, formatContractValue } from "./format";

type ContractsModule = typeof import("@glyph-oss/contracts");

export type DecodedContractField = {
  full: string;
  items: string[];
  json: unknown;
  kind: "array" | "hash" | "identity" | "value";
  label: string;
  name: string;
  type: string;
  value: string;
};

type DecodeState =
  | { fields: DecodedContractField[]; status: "idle" | "loading" }
  | { error: string; fields: DecodedContractField[]; status: "error" }
  | { fields: DecodedContractField[]; status: "ready" };

const initialState: DecodeState = { fields: [], status: "idle" };

const ACRONYMS = new Set(["id", "qu", "uri", "url"]);

// qubic/core Random.h stores K12(reveal) in `commit`. The ABI only knows the
// field as a 32-byte "id", but it is a digest, not an account identity.
const DIGEST_ID_FIELDS = new Set(["RANDOM.RevealAndCommit.commit"]);

function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Uint8Array) {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]));
  }
  return value;
}

function fieldLabel(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .split(/\s+/);

  return words
    .map((word, index) => {
      const normalized = word.toLowerCase();
      if (ACRONYMS.has(normalized)) {
        return normalized.toUpperCase();
      }
      return index === 0 ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : normalized;
    })
    .join(" ");
}

function toField(
  name: string,
  field: Parameters<ContractsModule["decodeFields"]>[1][number],
  value: unknown,
  hash: boolean,
): DecodedContractField {
  const raw = formatContractValue(value);
  const assetName = /assetname$/i.test(name) ? decodeAssetName(value) : null;
  const full = assetName ? `${assetName} (${raw})` : raw;
  const items = Array.isArray(value) ? value.map(formatContractValue) : [];
  const isArray = Array.isArray(value);
  const isIdentity = !hash && field.type === "id" && typeof value === "string";
  const valueText = isArray
    ? items.length <= 6
      ? items.join(", ")
      : `${items.slice(0, 4).join(", ")} … ${items.length} values`
    : (assetName ?? full);

  return {
    full,
    items,
    json: hash ? full : (assetName ?? toJsonValue(value)),
    kind: isArray ? "array" : hash ? "hash" : isIdentity ? "identity" : "value",
    label: fieldLabel(name),
    name,
    type: hash ? "digest" : contractFieldType(field),
    value: valueText,
  };
}

export function useDecodedContractInput({
  contractName,
  enabled,
  inputData,
  inputType,
}: {
  contractName: string | undefined;
  enabled: boolean;
  inputData: string | undefined;
  inputType: number | undefined;
}): DecodeState {
  const [state, setState] = useState<DecodeState>(initialState);

  useEffect(() => {
    if (!enabled || !contractName || !inputData || !inputType) {
      setState(initialState);
      return;
    }

    let cancelled = false;
    setState({ fields: [], status: "loading" });

    import("@glyph-oss/contracts")
      .then((contracts) => {
        if (cancelled) {
          return;
        }
        const contract = contracts.getContractDefinition(contractName);
        if (!contract) {
          throw new Error("Contract metadata is not available.");
        }
        const procedure = contracts.getProcedure(contract, inputType);
        const bytes = contracts.hexToBytes(inputData);
        const digestFieldNames = new Set(
          procedure.inputFields
            .filter((field) =>
              DIGEST_ID_FIELDS.has(`${contract.name}.${procedure.name}.${field.name}`),
            )
            .map((field) => field.name),
        );
        const decoded = contracts.decodeFields(bytes, procedure.inputFields, contract, {
          enumFormat: "name",
        });
        const decodedDigests =
          digestFieldNames.size > 0
            ? contracts.decodeFields(bytes, procedure.inputFields, contract, {
                enumFormat: "name",
                idFormat: "hex",
              })
            : decoded;
        setState({
          fields: procedure.inputFields.map((field) =>
            toField(
              field.name,
              field,
              digestFieldNames.has(field.name) ? decodedDigests[field.name] : decoded[field.name],
              digestFieldNames.has(field.name),
            ),
          ),
          status: "ready",
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setState({
          error: error instanceof Error ? error.message : "Could not decode this input.",
          fields: [],
          status: "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [contractName, enabled, inputData, inputType]);

  return state;
}
