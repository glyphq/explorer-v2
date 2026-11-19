import type { ContractCall, ContractDefinition, ContractField } from "@glyph-oss/contracts";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContractMark } from "@/components/explorer/contract-mark";
import { DetailSection } from "@/components/explorer/detail-section";
import { CopyButton, EpochLink } from "@/components/explorer/links";
import { PageHeader } from "@/components/explorer/page-header";
import { countLabel } from "@/lib/format";
import { CONTRACT_METADATA, contractSummaries, findContract } from "@/lib/contracts/registry";

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

function isPublicStruct(contract: ContractDefinition, name: string): boolean {
  if (!name.startsWith(`${contract.name}::`)) {
    return false;
  }
  const suffix = name.slice(contract.name.length + 2);
  return (
    !suffix.endsWith("_input") &&
    !suffix.endsWith("_output") &&
    !suffix.endsWith("_locals") &&
    !suffix.includes("_output::")
  );
}

function Metric({ hint, label, value }: { hint: string; label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">{value}</dd>
      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function FieldList({ fields, title }: { fields: ContractField[]; title: string }) {
  if (fields.length === 0) {
    return (
      <div>
        <p className="mb-2 font-medium text-[10px] text-muted uppercase tracking-[0.12em]">
          {title}
        </p>
        <p className="text-muted text-xs">No fields.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 font-medium text-[10px] text-muted uppercase tracking-[0.12em]">{title}</p>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div className="min-w-0" key={field.name}>
            <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="break-all font-mono font-medium text-[11px] text-foreground">
                {field.name}
              </span>
              <span
                className="font-mono text-[10px] text-muted"
                title={field.structRef ?? field.enumRef ?? field.type}
              >
                {fieldType(field)}
              </span>
            </dt>
            {field.description ? (
              <dd className="mt-1 text-[11px] text-muted leading-5">{field.description}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

function CallDetails({ call }: { call: ContractCall }) {
  return (
    <details className="group rounded-lg transition-colors hover:bg-surface-secondary/60">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <AltArrowDownIcon className="size-3 shrink-0 text-muted transition-transform group-open:rotate-180" />
          <span className="font-medium text-foreground text-xs">{call.name}</span>
        </span>
        <span className="font-mono text-[10px] text-muted">
          {call.inputType === null ? "notification" : `input ${call.inputType}`}
        </span>
      </summary>
      <div className="px-3 pb-4 pl-8">
        {call.description ? (
          <p className="mb-4 text-muted text-xs leading-5">{call.description}</p>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-2">
          <FieldList fields={call.inputFields} title="Input" />
          <FieldList fields={call.outputFields} title="Output" />
        </div>
      </div>
    </details>
  );
}

function CallSection({
  calls,
  description,
  empty,
  title,
}: {
  calls: ContractCall[];
  description: string;
  empty: string;
  title: string;
}) {
  return (
    <DetailSection description={description} title={title}>
      {calls.length === 0 ? (
        <p className="text-muted text-xs">{empty}</p>
      ) : (
        <div className="space-y-0.5">
          {calls.map((call) => (
            <CallDetails call={call} key={`${call.kind}-${call.name}`} />
          ))}
        </div>
      )}
    </DetailSection>
  );
}

export function generateStaticParams() {
  return contractSummaries.map((contract) => ({ contract: contract.name.toLowerCase() }));
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
  const hasCalls = contract.procedures.length > 0 || contract.functions.length > 0;
  const contractSource = sourceHref(contract);
  const hasDeploymentInfo =
    contract.constructionEpoch !== null ||
    contract.destructionEpoch !== null ||
    contract.stateSize !== null;

  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <PageHeader
        actions={
          <>
            <Link
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
              href={`/accounts/${contract.contractAddress}` as Route}
            >
              Account
            </Link>
            <a
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-surface"
              href={contractSource}
              rel="noreferrer"
              target="_blank"
            >
              Source
              <ArrowRightUpIcon className="size-3" />
            </a>
            <CopyButton label="Copy contract address" value={contract.contractAddress} />
          </>
        }
        description={
          <span className="flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded-full bg-surface-secondary px-2.5 py-1">Smart contract</span>
            <span className="rounded-full bg-surface-secondary px-2.5 py-1">
              Index {contract.index}
            </span>
            <span className="rounded-full bg-surface-secondary px-2.5 py-1">
              {contract.assetName}
            </span>
          </span>
        }
        title={
          <span className="flex items-center gap-3">
            <ContractMark name={contract.name} size={48} />
            {contract.name}
          </span>
        }
      >
        <div className="mt-4 flex min-w-0 items-center gap-2">
          <span className="break-all font-mono text-muted text-xs">{contract.contractAddress}</span>
        </div>
      </PageHeader>

      <dl className="flex flex-wrap gap-x-10 gap-y-5 py-6">
        <Metric hint="State-changing calls" label="Procedures" value={contract.procedures.length} />
        <Metric hint="Read-only queries" label="Functions" value={contract.functions.length} />
        {contract.notifications.length === 0 ? null : (
          <Metric
            hint="Emitted by procedures"
            label="Notifications"
            value={contract.notifications.length}
          />
        )}
        {customTypeCount === 0 ? null : (
          <Metric hint="Structs and enums" label="Custom types" value={customTypeCount} />
        )}
      </dl>

      {hasDeploymentInfo ? (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 pb-3 text-xs">
          {contract.constructionEpoch === null ? null : (
            <div className="flex items-center gap-1.5">
              <dt className="text-muted">Deployed</dt>
              <dd>
                <EpochLink epoch={contract.constructionEpoch} />
              </dd>
            </div>
          )}
          {contract.destructionEpoch === null ? null : (
            <div className="flex items-center gap-1.5">
              <dt className="text-muted">Destruction</dt>
              <dd>
                <EpochLink epoch={contract.destructionEpoch} />
              </dd>
            </div>
          )}
          {contract.stateSize === null ? null : (
            <div className="flex items-center gap-1.5">
              <dt className="text-muted">State size</dt>
              <dd className="font-mono">{formatBytes(contract.stateSize)}</dd>
            </div>
          )}
        </dl>
      ) : null}

      {hasCalls ? (
        <>
          <CallSection
            calls={contract.procedures}
            description="Calls that change contract state. The input type identifies the procedure on chain."
            empty="No state-changing procedures are published."
            title="Procedures"
          />
          <CallSection
            calls={contract.functions}
            description="Read-only queries answered by the contract."
            empty="No read-only functions are published."
            title="Functions"
          />
        </>
      ) : (
        <DetailSection
          description="This contract has no callable interface in the current metadata."
          title="Contract calls"
        >
          <p className="text-muted text-xs">
            No procedures or functions are published for this contract.
          </p>
        </DetailSection>
      )}

      {contract.notifications.length === 0 ? null : (
        <CallSection
          calls={contract.notifications}
          description="Notifications emitted while contract procedures run."
          empty="No notifications are published."
          title="Notifications"
        />
      )}

      {customTypeCount === 0 ? null : (
        <DetailSection
          description={countLabel(customTypeCount, "contract type")}
          title="Custom types"
        >
          <div className="space-y-0.5">
            {publicStructs.map((entry) => (
              <details
                className="group rounded-lg transition-colors hover:bg-surface-secondary/60"
                key={entry.name}
              >
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <AltArrowDownIcon className="size-3 shrink-0 text-muted transition-transform group-open:rotate-180" />
                    <span className="break-all font-mono font-medium text-[11px] text-foreground">
                      {entry.name.split("::").at(-1)}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    struct · {formatBytes(entry.byteLength)}
                  </span>
                </summary>
                <div className="px-3 pb-4 pl-8">
                  <FieldList fields={entry.fields} title="Fields" />
                </div>
              </details>
            ))}
            {publicEnums.map((entry) => (
              <div className="px-3 py-2.5" key={entry.name}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="break-all font-mono font-medium text-[11px] text-foreground">
                    {entry.name.split("::").at(-1)}
                  </p>
                  <p className="font-mono text-[10px] text-muted">enum · {entry.underlyingType}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
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
        </DetailSection>
      )}
    </div>
  );
}
