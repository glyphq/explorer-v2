"use client";

import { Skeleton } from "@heroui/react";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import type { ReactNode } from "react";

import { useTransactionContract } from "@/components/explorer/contract-provider";
import { CopyButton, IdentityLink, TickLink } from "@/components/explorer/links";
import { SectionHeading } from "@/components/explorer/page-header";
import type { Transaction } from "@/lib/api/generated/types.gen";
import {
  useDecodedContractInput,
  type DecodedContractField,
} from "@/lib/contracts/use-decoded-contract-input";
import { formatInteger, formatQu } from "@/lib/format";
import { decodeSpecialInput, type DecodedField } from "@/lib/transactions/special";

import { BoxLabel } from "./box-label";

function CallSection({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="py-6">
      <SectionHeading action={action} title={title} />
      {children}
    </section>
  );
}

function DecodedFieldBox({
  children,
  label,
  type,
}: {
  children: ReactNode;
  label: string;
  type?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-end justify-between gap-3">
        <BoxLabel>{label}</BoxLabel>
        {type ? (
          <span className="relative z-10 -mb-1 shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted leading-4">
            {type}
          </span>
        ) : null}
      </dt>
      <dd className="min-w-0 break-words rounded-lg bg-surface px-3 py-2 font-mono text-foreground text-xs leading-5">
        {children}
      </dd>
    </div>
  );
}

function DecodedFields({ decoded }: { decoded: ReturnType<typeof useDecodedContractInput> }) {
  if (decoded.status === "loading") {
    return (
      <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index}>
            <div className="mb-1 h-[18px] w-24 animate-pulse rounded-md bg-surface-secondary" />
            <div className="rounded-lg bg-surface px-3 py-2">
              <Skeleton className="h-3.5 w-4/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (decoded.status === "error") {
    return (
      <p className="text-muted text-xs">
        Input fields could not be decoded. The raw input data is shown below.
      </p>
    );
  }

  if (decoded.fields.length === 0) {
    return null;
  }

  return (
    <dl className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
      {decoded.fields.map((field) => (
        <DecodedFieldBox key={field.name} label={field.label} type={field.type}>
          {field.kind === "identity" ? (
            <IdentityLink avatar full className="min-w-0 break-all" identity={field.full} />
          ) : field.kind === "hash" ? (
            <span className="break-all font-mono" title={field.full}>
              {field.full}
            </span>
          ) : field.kind === "array" && field.items.length > 6 ? (
            <details className="group/array min-w-0">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-muted text-xs transition-colors hover:text-foreground">
                {formatInteger(field.items.length)} values
                <AltArrowRightIcon className="size-3 transition-transform group-open/array:rotate-90" />
              </summary>
              <ul className="mt-2 grid max-h-48 grid-cols-2 gap-x-4 gap-y-1 overflow-auto text-[10px] leading-5 sm:grid-cols-3">
                {field.items.map((item, index) => (
                  <li className="flex min-w-0 gap-1.5" key={`${field.name}-${index}`}>
                    <span className="w-5 shrink-0 text-right text-muted tabular-nums">{index}</span>
                    <span className="break-all text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <span className="break-words" title={field.full}>
              {field.value}
            </span>
          )}
        </DecodedFieldBox>
      ))}
    </dl>
  );
}

function SpecialFields({ fields }: { fields: DecodedField[] }) {
  return (
    <dl className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
      {fields.map((field) => (
        <DecodedFieldBox key={field.label} label={field.label}>
          {field.format === "tick" ? (
            <TickLink tick={field.tick} />
          ) : (
            <span className="break-all" title={field.title}>
              {field.value}
            </span>
          )}
        </DecodedFieldBox>
      ))}
    </dl>
  );
}

function decodedFieldsJson(fields: DecodedContractField[]): string {
  return JSON.stringify(
    Object.fromEntries(fields.map((field) => [field.name, field.json])),
    null,
    2,
  );
}

function DecodedInputSection({
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
  if (decoded.fields.length === 0 && decoded.status !== "loading" && decoded.status !== "error") {
    return null;
  }

  const json = decoded.fields.length > 0 ? decodedFieldsJson(decoded.fields) : undefined;

  return (
    <CallSection
      action={
        json ? (
          <CopyButton
            description="Decoded input as JSON"
            label="Copy decoded input as JSON"
            value={json}
          />
        ) : undefined
      }
      title="Decoded input"
    >
      <DecodedFields decoded={decoded} />
    </CallSection>
  );
}

export function ContractCallPanel({ transaction }: { transaction: Transaction | undefined }) {
  const call = useTransactionContract(transaction);

  if (call.kind === "special") {
    const decoded = decodeSpecialInput(call.inputType, transaction?.input_data);
    const fields =
      transaction?.amount !== undefined && (call.inputType === 2 || call.inputType === 12)
        ? [{ label: "Deposit", value: formatQu(transaction.amount) }, ...decoded.fields]
        : decoded.fields;
    if (fields.length === 0) {
      return null;
    }

    const json = JSON.stringify(
      Object.fromEntries(fields.map((field) => [field.label, field.value])),
      null,
      2,
    );
    return (
      <CallSection
        action={
          json ? (
            <CopyButton
              description="Decoded payload as JSON"
              label="Copy decoded payload as JSON"
              value={json}
            />
          ) : undefined
        }
        title="Decoded payload"
      >
        <SpecialFields fields={fields} />
      </CallSection>
    );
  }

  if (call.kind !== "call") {
    return null;
  }

  if (!call.contract) {
    return (
      <CallSection title="Input data">
        <div className="rounded-xl bg-surface p-4">
          <p className="text-muted text-xs leading-5">
            <IdentityLink avatar full identity={transaction?.destination ?? ""} /> is not in the
            contract registry, so its input cannot be decoded.
          </p>
        </div>
      </CallSection>
    );
  }

  return (
    <DecodedInputSection
      contractName={call.contract.name}
      inputData={transaction?.input_data}
      inputType={call.inputType}
    />
  );
}
