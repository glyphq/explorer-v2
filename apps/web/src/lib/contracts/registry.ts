import { CONTRACTS, CONTRACT_METADATA } from "@glyph-oss/contracts";
import type { ContractDefinition } from "@glyph-oss/contracts";

import type { ContractSummary } from "./types";

export const contractSummaries: ContractSummary[] = CONTRACTS.map((contract) => ({
  address: contract.contractAddress,
  assetName: contract.assetName,
  constructionEpoch: contract.constructionEpoch,
  functionCount: contract.functions.length,
  index: contract.index,
  name: contract.name,
  notificationCount: contract.notifications.length,
  procedures: contract.procedures.flatMap((procedure) =>
    procedure.inputType === null ? [] : [{ inputType: procedure.inputType, name: procedure.name }],
  ),
}));

const summariesByAddress = new Map(
  contractSummaries.map((contract) => [contract.address.toUpperCase(), contract]),
);
const summariesByIndex = new Map(contractSummaries.map((contract) => [contract.index, contract]));
const summariesByName = new Map(
  contractSummaries.flatMap((contract) => [
    [contract.name.toUpperCase(), contract] as const,
    [contract.assetName.toUpperCase(), contract] as const,
  ]),
);

export function findContractSummary(ref: string | number): ContractSummary | undefined {
  if (typeof ref === "number") {
    return summariesByIndex.get(ref);
  }

  const key = ref.toUpperCase();
  return summariesByAddress.get(key) ?? summariesByName.get(key);
}

export function findContract(ref: string): ContractDefinition | undefined {
  const numeric = Number(ref);
  if (Number.isInteger(numeric) && numeric > 0) {
    return CONTRACTS.find((contract) => contract.index === numeric);
  }

  const key = ref.toUpperCase();
  return (
    CONTRACTS.find((contract) => contract.contractAddress.toUpperCase() === key) ??
    CONTRACTS.find((contract) => contract.name.toUpperCase() === key) ??
    CONTRACTS.find((contract) => contract.assetName.toUpperCase() === key)
  );
}

export { CONTRACT_METADATA };
export type { ContractDefinition };
