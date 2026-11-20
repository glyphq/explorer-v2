"use client";

import { Skeleton } from "@heroui/react";

import { useTransactionContract } from "@/components/explorer/contract-provider";
import { DetailSection } from "@/components/explorer/detail-section";
import { IdentityLink } from "@/components/explorer/links";
import type { Transaction } from "@/lib/api/generated/types.gen";
import { useDecodedContractInput } from "@/lib/contracts/use-decoded-contract-input";
import { formatInteger, formatQu } from "@/lib/format";
import { decodeSpecialInput } from "@/lib/transactions/special";

function DecodedFields({
  contractName,
  inputData,
  inputType,
}: {
  contractName: string;
  inputData: string | undefined;
  inputType: number | undefined;
}) {
  const decoded = useDecodedContractInput({
    contractName,
    enabled: true,
    inputData,
    inputType,
  });

  if (decoded.status === "loading") {
    return (
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index}>
            <Skeleton className="h-2.5 w-24 rounded" />
            <Skeleton className="mt-2.5 h-3.5 w-4/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (decoded.status === "error") {
    return (
      <p className="text-muted text-xs">
        Input fields could not be decoded. The raw input data is still available below.
      </p>
    );
  }

  if (decoded.fields.length === 0) {
    return <p className="text-muted text-xs">This procedure takes no input fields.</p>;
  }

  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {decoded.fields.map((field) => (
        <div className="min-w-0" key={field.name}>
          <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono font-medium text-[11px] text-foreground">{field.name}</span>
            <span className="font-mono text-[10px] text-muted">{field.type}</span>
          </dt>
          <dd className="mt-1.5 break-all font-mono text-foreground text-xs leading-5">
            {field.kind === "identity" ? (
              <IdentityLink identity={field.full} />
            ) : field.kind === "array" && field.items.length > 6 ? (
              <details>
                <summary className="cursor-pointer text-muted hover:text-foreground">
                  {formatInteger(field.items.length)} values
                </summary>
                <p className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-4">
                  {field.items.join(", ")}
                </p>
              </details>
            ) : (
              <span title={field.full}>{field.value}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ContractCallPanel({ transaction }: { transaction: Transaction | undefined }) {
  const call = useTransactionContract(transaction);

  if (call.kind === "special") {
    const special = call.special;
    const decoded = decodeSpecialInput(call.inputType, transaction?.input_data);
    const fields =
      transaction?.amount !== undefined && (call.inputType === 2 || call.inputType === 12)
        ? [{ label: "Deposit", value: formatQu(transaction.amount) }, ...decoded.fields]
        : decoded.fields;
    return (
      <DetailSection
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>system transaction</span>
            <span className="text-muted/50">·</span>
            <span>input type {call.inputType}</span>
          </span>
        }
        title={special?.label ?? "Special transaction"}
      >
        <p className="max-w-2xl text-muted text-xs leading-5">{special?.description}</p>
        {fields.length > 0 ? (
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {fields.map((field) => (
              <div className="min-w-0" key={field.label}>
                <dt className="font-mono font-medium text-[11px] text-foreground">{field.label}</dt>
                <dd
                  className="mt-1.5 break-all font-mono text-foreground text-xs leading-5"
                  title={field.title}
                >
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {decoded.note ? (
          <p className="mt-5 max-w-2xl text-muted text-xs leading-5">{decoded.note}</p>
        ) : null}
        <p className="mt-5 max-w-2xl text-muted text-xs leading-5">
          The zero address is Qubic&apos;s protocol NULL_ID. It receives deposits, votes, oracle
          replies, and other system payloads, so a transfer to it is not automatically a burn.
        </p>
      </DetailSection>
    );
  }

  if (call.kind !== "call") {
    return null;
  }

  if (!call.contract) {
    return (
      <DetailSection
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <IdentityLink identity={transaction?.destination ?? ""} />
            <span className="text-muted/50">·</span>
            <span>input type {call.inputType}</span>
          </span>
        }
        title="Contract call"
      >
        <p className="text-muted text-xs">
          This destination is not in the contract registry, so its input cannot be decoded.
        </p>
      </DetailSection>
    );
  }

  return (
    <DetailSection
      description={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <IdentityLink identity={transaction?.destination ?? ""} />
          <span className="text-muted/50">·</span>
          <span>input type {call.inputType}</span>
        </span>
      }
      title={call.procedure?.name ?? "Contract call"}
    >
      <DecodedFields
        contractName={call.contract.name}
        inputData={transaction?.input_data}
        inputType={call.inputType}
      />
    </DetailSection>
  );
}
