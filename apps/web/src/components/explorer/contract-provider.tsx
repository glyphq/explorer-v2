"use client";

import { createContext, useContext, useMemo } from "react";

import type { Transaction } from "@/lib/api/generated/types.gen";
import { isZeroIdentity } from "@/lib/contracts/constants";
import type { ContractSummary } from "@/lib/contracts/types";
import {
  specialTransactionType,
  type SpecialTransactionType,
} from "@/lib/transactions/special-hash";

type ContractRegistry = {
  byAddress: ReadonlyMap<string, ContractSummary>;
  byIndex: ReadonlyMap<number, ContractSummary>;
  contracts: readonly ContractSummary[];
};

const emptyRegistry: ContractRegistry = {
  byAddress: new Map(),
  byIndex: new Map(),
  contracts: [],
};

const ContractContext = createContext<ContractRegistry>(emptyRegistry);

export function ContractProvider({
  children,
  contracts,
}: {
  children: React.ReactNode;
  contracts: readonly ContractSummary[];
}) {
  const value = useMemo<ContractRegistry>(() => {
    const byAddress = new Map<string, ContractSummary>();
    const byIndex = new Map<number, ContractSummary>();
    for (const contract of contracts) {
      byAddress.set(contract.address.toUpperCase(), contract);
      byIndex.set(contract.index, contract);
    }
    return { byAddress, byIndex, contracts };
  }, [contracts]);

  return <ContractContext.Provider value={value}>{children}</ContractContext.Provider>;
}

export function useContractRegistry(): ContractRegistry {
  return useContext(ContractContext);
}

export function useContract(identity: string | null | undefined): ContractSummary | undefined {
  const { byAddress } = useContractRegistry();
  return identity ? byAddress.get(identity.toUpperCase()) : undefined;
}

export function useContractByIndex(index: number | null | undefined): ContractSummary | undefined {
  const { byIndex } = useContractRegistry();
  return index === null || index === undefined ? undefined : byIndex.get(index);
}

export type TransactionContract = {
  contract?: ContractSummary;
  inputType: number;
  kind: "call" | "special" | "transfer";
  procedure?: ContractSummary["procedures"][number];
  special?: SpecialTransactionType;
};

export function useTransactionContract(
  transaction: Pick<Transaction, "destination" | "input_type"> | null | undefined,
): TransactionContract {
  const contract = useContract(transaction?.destination);
  const inputType = transaction?.input_type ?? 0;

  if (isZeroIdentity(transaction?.destination)) {
    if (inputType === 0) {
      return { inputType, kind: "transfer" };
    }
    return { inputType, kind: "special", special: specialTransactionType(inputType) };
  }

  if (inputType === 0) {
    return { inputType, kind: "transfer" };
  }

  return {
    contract,
    inputType,
    kind: "call",
    procedure: contract?.procedures.find((candidate) => candidate.inputType === inputType),
  };
}
