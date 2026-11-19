"use client";

import { useEffect, useState } from "react";

import { contractFieldType, decodeAssetName, formatContractValue } from "./format";

type ContractsModule = typeof import("@glyph-oss/contracts");

export type DecodedContractField = {
  full: string;
  items: string[];
  kind: "array" | "identity" | "value";
  name: string;
  type: string;
  value: string;
};

type DecodeState =
  | { fields: DecodedContractField[]; status: "idle" | "loading" }
  | { error: string; fields: DecodedContractField[]; status: "error" }
  | { fields: DecodedContractField[]; status: "ready" };

const initialState: DecodeState = { fields: [], status: "idle" };

function toField(
  name: string,
  field: Parameters<ContractsModule["decodeFields"]>[1][number],
  value: unknown,
): DecodedContractField {
  const raw = formatContractValue(value);
  const assetName = /assetname$/i.test(name) ? decodeAssetName(value) : null;
  const full = assetName ? `${assetName} (${raw})` : raw;
  const items = Array.isArray(value) ? value.map(formatContractValue) : [];
  const isArray = Array.isArray(value);
  const isIdentity = field.type === "id" && typeof value === "string";
  const valueText = isArray
    ? items.length <= 6
      ? items.join(", ")
      : `${items.slice(0, 4).join(", ")} … ${items.length} values`
    : (assetName ?? full);

  return {
    full,
    items,
    kind: isArray ? "array" : isIdentity ? "identity" : "value",
    name,
    type: contractFieldType(field),
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
        const decoded = contracts.decodeFields(bytes, procedure.inputFields, contract, {
          enumFormat: "name",
        });
        setState({
          fields: procedure.inputFields.map((field) =>
            toField(field.name, field, decoded[field.name]),
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
