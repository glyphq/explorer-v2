import {
  bytesToHex,
  decodeFunctionOutput,
  encodeFunctionInput,
  getContractDefinition,
  hexToBytes,
  publicKeyToIdentity,
  type ContractCall,
  type ContractDefinition,
} from "@glyph-oss/contracts";

import { GLYPH_API_URL } from "@/lib/api/hey-api";
import { BURN_IDENTITY } from "@/lib/contracts/constants";

import type { Proposal, ProposalOption } from "./proposals";

type ContractIndexResponse = {
  indices: number[];
  numOfIndices: number;
};

type ContractProposalResponse = {
  proposal: {
    data?: number[] | Uint8Array;
    epoch: number;
    tick: number;
    type?: number;
    url: number[] | Uint8Array;
  };
};

type VotingResultsResponse = {
  results: {
    optionVoteCount: number[];
  };
};

type GovernanceContract = {
  definition: ContractDefinition;
  label: string;
  name: "CCF" | "GQMPROP";
  proposalType: string;
};

const CONTRACTS: GovernanceContract[] = [
  {
    definition: getContractDefinition("GQMPROP"),
    label: "General Quorum Proposal",
    name: "GQMPROP",
    proposalType: "General options",
  },
  {
    definition: getContractDefinition("CCF"),
    label: "Computor Controlled Fund",
    name: "CCF",
    proposalType: "Transfer",
  },
];

const STATUS = { PASSED: 3, REJECTED: 6, VOTING: 2, INCONCLUSIVE: 7 } as const;
const QUORUM = 451;

const titleCache = new Map<string, string>();

function proposalId(contractIndex: number, proposalIndex: number): string {
  return `${contractIndex}:${proposalIndex}`;
}

function findFunction(definition: ContractDefinition, name: string): ContractCall {
  const fn = definition.functions.find((candidate) => candidate.name === name);
  if (!fn || fn.inputType === null) {
    throw new Error(`${definition.name}.${name} is not a queryable contract function.`);
  }
  return fn;
}

async function queryContract<T>(
  definition: ContractDefinition,
  functionName: string,
  input: Record<string, bigint | boolean | number | string>,
): Promise<T> {
  const fn = findFunction(definition, functionName);
  const inputType = fn.inputType;
  if (inputType === null) {
    throw new Error(`${definition.name}.${functionName} has no input type.`);
  }
  const encoded = encodeFunctionInput(definition, inputType, input);
  const response = await fetch(`${GLYPH_API_URL}/v1/live/contracts/${definition.index}/query`, {
    body: JSON.stringify({ input: bytesToHex(encoded.payload), input_type: inputType }),
    cache: "no-store",
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`${definition.name}.${functionName} returned ${response.status}.`);
  }
  const body = (await response.json()) as { data?: { output?: string } };
  const output = body.data?.output;
  if (!output) {
    throw new Error(`${definition.name}.${functionName} returned no output.`);
  }
  return decodeFunctionOutput(definition, inputType, hexToBytes(output), {
    enumFormat: "name",
  }) as T;
}

function decodeText(bytes: number[] | Uint8Array | undefined): string {
  const data = bytes ? Uint8Array.from(bytes) : new Uint8Array();
  const end = data.indexOf(0);
  return new TextDecoder().decode(data.subarray(0, end === -1 ? undefined : end));
}

function decodeUint64(data: Uint8Array, offset: number): bigint {
  let value = BigInt(0);
  for (let index = offset + 7; index >= offset; index -= 1) {
    value = (value << BigInt(8)) | BigInt(data[index] ?? 0);
  }
  return value;
}

function githubRawUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") {
      return null;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 5 || (parts[2] !== "blob" && parts[2] !== "raw")) {
      return null;
    }
    return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts[3]}/${parts
      .slice(4)
      .join("/")}`;
  } catch {
    return null;
  }
}

function cleanTitle(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function fallbackTitle(url: string, proposalIndex: number): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "github.com") {
      const file = parsed.pathname.split("/").at(-1) ?? "";
      const label = decodeURIComponent(file)
        .replace(/\.(md|markdown|txt)$/i, "")
        .replace(/^\d{4}-\d{2}-\d{2}[-_]?/, "")
        .replace(/[-_]+/g, " ")
        .trim();
      if (label) {
        return label.replace(/\b\w/g, (character) => character.toUpperCase());
      }
    }
  } catch {
    // Fall through to the generic label.
  }
  return `Proposal #${proposalIndex}`;
}

async function readTitle(url: string, proposalIndex: number): Promise<string> {
  const fallback = fallbackTitle(url, proposalIndex);
  const rawUrl = githubRawUrl(url);
  if (!rawUrl) {
    return fallback;
  }
  const cached = titleCache.get(rawUrl);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(rawUrl, { next: { revalidate: 86_400 } });
    if (!response.ok) {
      return fallback;
    }
    const markdown = await response.text();
    const title =
      [...markdown.matchAll(/^\s*#\s+(.+)$/gm)]
        .map((match) => cleanTitle(match[1] ?? ""))
        .find(Boolean) ?? fallback;
    titleCache.set(rawUrl, title);
    return title;
  } catch {
    return fallback;
  }
}

function votingResults(response: VotingResultsResponse): {
  counts: number[];
  totalVotes: number;
} {
  // The generated decoder misaligns this struct after the leading bit field.
  // The first entry of optionVoteCount is the total number of votes cast.
  const raw = response.results.optionVoteCount ?? [];
  return { counts: raw.slice(1).map(Number), totalVotes: Number(raw[0] ?? 0) };
}

function optionCountForType(type: number): number {
  return type & 0x00ff;
}

function proposalClass(type: number): number {
  return type & 0xff00;
}

function transferDetails(type: number, data: number[] | Uint8Array | undefined) {
  const bytes = data ? Uint8Array.from(data) : new Uint8Array();
  const optionCount = optionCountForType(type);
  const details: {
    transferAmount?: string;
    transferAmounts?: number[];
    transferDestinationIdentity?: string;
    transferTargetEpoch?: number;
  } = {};
  if (proposalClass(type) === 0x400) {
    if (bytes.length < 42) {
      return details;
    }
    details.transferAmount = BigInt.asIntN(64, decodeUint64(bytes, 32)).toString();
    details.transferDestinationIdentity = publicKeyToIdentity(bytes.subarray(0, 32));
    details.transferTargetEpoch = bytes[40]! | (bytes[41]! << 8);
    return details;
  }
  if (proposalClass(type) !== 0x100 || bytes.length < 32) {
    return details;
  }
  const amounts: number[] = [];
  for (let index = 0; index < Math.max(0, optionCount - 1); index += 1) {
    const offset = 32 + index * 8;
    if (offset + 8 > bytes.length) {
      break;
    }
    amounts.push(Number(BigInt.asIntN(64, decodeUint64(bytes, offset))));
  }
  details.transferAmount = amounts[0] === undefined ? undefined : String(amounts[0]);
  details.transferAmounts = amounts;
  details.transferDestinationIdentity = publicKeyToIdentity(bytes.subarray(0, 32));
  return details;
}

function optionLabels(
  type: number,
  details: { transferAmount?: string; transferAmounts?: number[]; transferTargetEpoch?: number },
): string[] {
  const optionCount = optionCountForType(type);
  const labels: string[] = [];
  if (proposalClass(type) === 0x100) {
    labels.push("No transfer");
    for (const amount of details.transferAmounts ?? []) {
      labels.push(`Send ${amount.toLocaleString("en-US")} QU`);
    }
  } else if (proposalClass(type) === 0x400) {
    labels.push("No transfer");
    labels.push(
      `Send ${Number(details.transferAmount).toLocaleString("en-US")} QU in epoch ${
        details.transferTargetEpoch
      }`,
    );
  } else if (optionCount === 2) {
    labels.push("No", "Yes");
  } else {
    labels.push("No change");
    for (let index = 1; index < optionCount; index += 1) {
      labels.push(`Option ${index}`);
    }
  }
  return labels;
}

function proposalStatus(active: boolean, totalVotes: number, counts: number[]): number {
  if (active) {
    return STATUS.VOTING;
  }
  if (totalVotes < QUORUM) {
    return STATUS.INCONCLUSIVE;
  }
  let winnerIndex = -1;
  let winnerVotes = -1;
  for (let index = 0; index < counts.length; index += 1) {
    if ((counts[index] ?? 0) > winnerVotes) {
      winnerVotes = counts[index] ?? 0;
      winnerIndex = index;
    }
  }
  if (winnerIndex <= 0 || winnerVotes <= Math.floor(QUORUM / 2)) {
    return STATUS.REJECTED;
  }
  return STATUS.PASSED;
}

async function readProposal(
  contract: GovernanceContract,
  proposalIndex: number,
  active: boolean,
): Promise<Proposal> {
  const proposalInput: Record<string, bigint | boolean | number | string> = { proposalIndex };
  if (contract.name === "CCF") {
    proposalInput.subscriptionDestination = BURN_IDENTITY;
  }
  const [proposalResponse, resultsResponse] = await Promise.all([
    queryContract<ContractProposalResponse>(contract.definition, "GetProposal", proposalInput),
    queryContract<VotingResultsResponse>(contract.definition, "GetVotingResults", {
      proposalIndex,
    }),
  ]);
  const { proposal } = proposalResponse;
  const { counts, totalVotes } = votingResults(resultsResponse);
  const type = proposal.type ?? (contract.name === "CCF" ? 258 : 2);
  const details = transferDetails(type, proposal.data);
  const labels = optionLabels(type, details);
  const options: ProposalOption[] = labels.map((label, index) => ({
    index,
    label,
    numberOfVotes: counts[index] ?? 0,
  }));
  const url = decodeText(proposal.url);

  return {
    contractIndex: contract.definition.index,
    contractName: contract.label,
    epoch: proposal.epoch,
    id: proposalId(contract.definition.index, proposalIndex),
    options,
    proposalIndex,
    proposalType: contract.proposalType,
    publishedTick: proposal.tick,
    status: proposalStatus(
      active,
      totalVotes,
      options.map((option) => option.numberOfVotes),
    ),
    title: await readTitle(url, proposalIndex),
    totalVotes,
    transferAmount: details.transferAmount,
    transferDestinationIdentity: details.transferDestinationIdentity,
    url,
  };
}

async function readProposalIndices(
  contract: GovernanceContract,
  activeProposals: boolean,
): Promise<number[]> {
  const indices: number[] = [];
  let previousIndex = -1;

  for (let page = 0; page < 32; page += 1) {
    const response = await queryContract<ContractIndexResponse>(
      contract.definition,
      "GetProposalIndices",
      { activeProposals, prevProposalIndex: previousIndex },
    );
    const pageIndices = response.indices.slice(0, response.numOfIndices);
    indices.push(...pageIndices);
    const lastIndex = pageIndices.at(-1);
    if (pageIndices.length < 64 || lastIndex === undefined || lastIndex <= previousIndex) {
      break;
    }
    previousIndex = lastIndex;
  }

  return [...new Set(indices)];
}

async function readContractProposals(
  contract: GovernanceContract,
  existingIds: Set<string>,
  openIds: Set<string>,
): Promise<Proposal[]> {
  const [activeIndices, inactiveIndices] = await Promise.all([
    readProposalIndices(contract, true),
    readProposalIndices(contract, false),
  ]);
  const activeIndex = new Set(activeIndices);
  const indices = [...new Set([...activeIndices, ...inactiveIndices])];

  const required = indices.filter((proposalIndex) => {
    const id = proposalId(contract.definition.index, proposalIndex);
    return activeIndex.has(proposalIndex) || !existingIds.has(id) || openIds.has(id);
  });

  return mapConcurrent(required, 6, (proposalIndex) =>
    readProposal(contract, proposalIndex, activeIndex.has(proposalIndex)),
  );
}

async function mapConcurrent<T, U>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<U>,
): Promise<U[]> {
  const output = Array.from({ length: items.length }) as U[];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(items[index] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

export async function readChangedProposals(
  existing: Proposal[],
  openIds: Set<string>,
): Promise<Proposal[]> {
  const existingById = new Map(existing.map((proposal) => [proposal.id, proposal]));
  const existingIds = new Set(existing.map((proposal) => proposal.id));
  const proposals = (
    await Promise.all(
      CONTRACTS.map((contract) => readContractProposals(contract, existingIds, openIds)),
    )
  ).flat();
  const archived: Proposal[] = [];
  for (const proposal of proposals) {
    const previous = existingById.get(proposal.id);
    if (
      previous?.publishedTick !== undefined &&
      previous.publishedTick !== proposal.publishedTick
    ) {
      archived.push({
        ...previous,
        archived: true,
        id: `${previous.contractIndex}:${previous.proposalIndex}:${previous.publishedTick}`,
        slug: String(previous.publishedTick),
      });
    }
  }
  return [...proposals, ...archived].sort(
    (left, right) =>
      right.epoch - left.epoch ||
      left.contractIndex - right.contractIndex ||
      (right.publishedTick ?? 0) - (left.publishedTick ?? 0),
  );
}
