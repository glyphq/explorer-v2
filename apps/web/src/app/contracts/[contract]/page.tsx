import type { ContractCall, ContractDefinition, ContractField } from "@glyph-oss/contracts";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { BoxLabel } from "@/components/explorer/box-label";
import { ContractMark } from "@/components/explorer/contract-mark";
import { CopyableId, EpochLink } from "@/components/explorer/links";
import { SectionHeading } from "@/components/explorer/page-header";
import { CONTRACT_METADATA, contractSummaries, findContract } from "@/lib/contracts/registry";
import { formatInteger } from "@/lib/format";

function formatBytes(value: number | null): string {
  if (value === null) {
    return "—";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function fieldType(field: ContractField): string {
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

function sourceHref(contract: ContractDefinition): string {
  const { commit, repository } = CONTRACT_METADATA.source;
  return `https://github.com/${repository}/blob/${commit}/${contract.source.path}#L${contract.source.line}`;
}

function cleanDescription(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const brief = value.match(/@brief\s+([\s\S]*?)(?=\n\s*@|$)/i)?.[1];
  const summary = (brief ?? value.split(/\n\s*@/)[0] ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:PUBLIC|PRIVATE)\s+(?:PROCEDURE|FUNCTION)\b[:\s-]*/i, "");
  return summary || null;
}

function isPublicStruct(contract: ContractDefinition, name: string): boolean {
  if (!name.startsWith(`${contract.name}::`)) {
    return false;
  }
  const suffix = name.slice(contract.name.length + 2);
  return !(
    suffix.endsWith("_input") ||
    suffix.endsWith("_output") ||
    suffix.endsWith("_locals") ||
    suffix.includes("_output::")
  );
}

const actionClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 font-medium text-foreground text-xs transition-colors hover:text-accent";

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-[11px] text-foreground leading-4 [&_a]:text-[11px] [&_a]:text-foreground">
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>
        <BoxLabel>{label}</BoxLabel>
      </dt>
      <dd className="rounded-lg bg-surface px-3 py-2 font-semibold text-xl tabular-nums tracking-tight">
        {formatInteger(value)}
      </dd>
    </div>
  );
}

function PageSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="py-6">
      <SectionHeading title={title} />
      {children}
    </section>
  );
}

function FieldList({ fields, title }: { fields: ContractField[]; title: string }) {
  return (
    <div>
      <p className="mb-2.5 flex items-baseline gap-2 font-medium text-[10px] text-muted uppercase tracking-[0.12em]">
        {title}
        <span className="font-mono text-[9px] normal-case tracking-normal">
          {formatInteger(fields.length)}
        </span>
      </p>
      {fields.length === 0 ? (
        <p className="text-muted text-xs">None</p>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2">
          {fields.map((field) => {
            const description = cleanDescription(field.description);
            return (
              <div className="min-w-0 rounded-md bg-surface-secondary px-2.5 py-2" key={field.name}>
                <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="break-all font-medium font-mono text-[11px] text-foreground">
                    {field.name}
                  </span>
                  <span
                    className="ml-auto shrink-0 font-mono text-[10px] text-muted"
                    title={field.structRef ?? field.enumRef ?? field.type}
                  >
                    {fieldType(field)}
                  </span>
                </dt>
                {description ? (
                  <dd className="mt-1 text-[11px] text-muted leading-5">{description}</dd>
                ) : null}
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

function CallDetails({ call }: { call: ContractCall }) {
  const description = cleanDescription(call.description);

  return (
    <details className="group rounded-lg bg-surface transition-colors hover:bg-surface-secondary/60">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <AltArrowDownIcon className="size-3 shrink-0 text-muted transition-transform group-open:rotate-180" />
          <span className="break-words font-medium text-foreground text-xs">{call.name}</span>
        </span>
        <span className="shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted leading-4">
          {call.inputType === null ? "notification" : `input ${call.inputType}`}
        </span>
      </summary>
      <div className="px-3 pb-4 pl-8">
        {description ? <p className="mb-3 text-muted text-xs leading-5">{description}</p> : null}
        <div className="grid gap-5 lg:grid-cols-2">
          <FieldList fields={call.inputFields} title="Input" />
          <FieldList fields={call.outputFields} title="Output" />
        </div>
      </div>
    </details>
  );
}

function CallSection({ calls, title }: { calls: ContractCall[]; title: string }) {
  if (calls.length === 0) {
    return null;
  }

  return (
    <PageSection title={title}>
      <div className="space-y-1.5">
        {calls.map((call) => (
          <CallDetails call={call} key={`${call.kind}-${call.name}`} />
        ))}
      </div>
    </PageSection>
  );
}

export function generateStaticParams() {
  return contractSummaries.map((contract) => ({
    contract: contract.name.toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contract: string }>;
}): Promise<Metadata> {
  const { contract: ref } = await params;
  const contract = findContract(ref);
  if (!contract) {
    return { title: "Smart contract" };
  }
  const title = `${contract.name} smart contract`;
  return {
    description: `${contract.name} contract address, ${contract.procedures.length} procedures and ${contract.functions.length} functions on Qubic.`,
    openGraph: { title },
    title,
    twitter: { title },
  };
}

export default async function ContractPage({ params }: { params: Promise<{ contract: string }> }) {
  const { contract: ref } = await params;
  const contract = findContract(ref);
  if (!contract) {
    notFound();
  }

  const publicStructs = Object.values(contract.structs).filter((entry) =>
    isPublicStruct(contract, entry.name),
  );
  const publicEnums = Object.values(contract.enums).filter((entry) =>
    entry.name.startsWith(`${contract.name}::`),
  );
  const customTypeCount = publicStructs.length + publicEnums.length;
  const contractSource = sourceHref(contract);
  const stats = [
    { label: "Procedures", value: contract.procedures.length },
    { label: "Functions", value: contract.functions.length },
    ...(contract.notifications.length > 0
      ? [{ label: "Notifications", value: contract.notifications.length }]
      : []),
    ...(customTypeCount > 0 ? [{ label: "Custom types", value: customTypeCount }] : []),
  ];

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <header className="pb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-3 break-words font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
              <ContractMark name={contract.name} size={32} />
              {contract.name}
            </h1>
            <div className="mt-2 min-w-0 text-muted text-xs">
              <CopyableId value={contract.contractAddress} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link className={actionClass} href={`/accounts/${contract.contractAddress}` as Route}>
              Account
            </Link>
            <a className={actionClass} href={contractSource} rel="noreferrer" target="_blank">
              Source
              <ArrowRightUpIcon className="size-3" />
            </a>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <MetaChip>Index {formatInteger(contract.index)}</MetaChip>
          <MetaChip>{contract.assetName}</MetaChip>
          {contract.constructionEpoch === null ? null : (
            <MetaChip>
              <span className="text-muted">Deployed</span>
              <EpochLink epoch={contract.constructionEpoch} />
            </MetaChip>
          )}
          {contract.destructionEpoch === null ? null : (
            <MetaChip>
              <span className="text-muted">Destruction</span>
              <EpochLink epoch={contract.destructionEpoch} />
            </MetaChip>
          )}
          {contract.stateSize === null ? null : (
            <MetaChip>
              <span className="text-muted">State</span>
              {formatBytes(contract.stateSize)}
            </MetaChip>
          )}
        </div>

        {stats.length === 0 ? null : (
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            {stats.map((stat) => (
              <Stat key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </dl>
        )}
      </header>

      <CallSection calls={contract.procedures} title="Procedures" />
      <CallSection calls={contract.functions} title="Functions" />
      <CallSection calls={contract.notifications} title="Notifications" />

      {customTypeCount === 0 ? null : (
        <PageSection title="Custom types">
          <div className="space-y-1.5">
            {publicStructs.map((entry) => (
              <details
                className="group rounded-lg bg-surface transition-colors hover:bg-surface-secondary/60"
                key={entry.name}
              >
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <AltArrowDownIcon className="size-3 shrink-0 text-muted transition-transform group-open:rotate-180" />
                    <span className="break-all font-medium font-mono text-[11px] text-foreground">
                      {entry.name.split("::").at(-1)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted leading-4">
                    struct · {formatBytes(entry.byteLength)}
                  </span>
                </summary>
                <div className="px-3 pb-4 pl-8">
                  <FieldList fields={entry.fields} title="Fields" />
                </div>
              </details>
            ))}
            {publicEnums.map((entry) => (
              <div className="rounded-lg bg-surface px-3 py-2.5" key={entry.name}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <p className="break-all font-medium font-mono text-[11px] text-foreground">
                    {entry.name.split("::").at(-1)}
                  </p>
                  <p className="shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted leading-4">
                    enum · {entry.underlyingType}
                  </p>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {entry.values.map((value) => (
                    <span
                      className="rounded-full bg-surface-secondary px-2 py-1 font-mono text-[10px] text-muted"
                      key={`${entry.name}-${value.value}`}
                      title={`${value.value}`}
                    >
                      {value.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      )}
    </div>
  );
}
