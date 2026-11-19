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
    const heading = markdown.match(/^\s*#\s+(.+)$/m)?.[1];
    const title = heading ? cleanTitle(heading) : fallback;
    titleCache.set(rawUrl, title);
    return title;
  } catch {
    return fallback;
  }
}

function optionCounts(response: VotingResultsResponse): [number, number] {
  const counts = response.results.optionVoteCount;
  return [Number(counts[1] ?? 0), Number(counts[2] ?? 0)];
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
  const [noVotes, yesVotes] = optionCounts(resultsResponse);
  const totalVotes = noVotes + yesVotes;
  const status = active
    ? STATUS.VOTING
    : totalVotes === 0 || noVotes === yesVotes
      ? STATUS.INCONCLUSIVE
      : yesVotes > noVotes
        ? STATUS.PASSED
        : STATUS.REJECTED;

  let transferDestinationIdentity: string | undefined;
  let transferAmount: string | undefined;
  if (contract.name === "CCF" && proposal.data) {
    const data = Uint8Array.from(proposal.data);
    if (data.length >= 40) {
      transferDestinationIdentity = publicKeyToIdentity(data.subarray(0, 32));
      transferAmount = decodeUint64(data, 32).toString();
    }
  }

  const optionLabels =
    contract.name === "CCF" && transferAmount
      ? ["No transfer", `Send ${Number(transferAmount).toLocaleString("en-US")} QU`]
      : ["No", "Yes"];
  const options: ProposalOption[] = optionLabels.map((label, index) => ({
    index,
    label,
    numberOfVotes: index === 0 ? noVotes : yesVotes,
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
    status,
    title: await readTitle(url, proposalIndex),
    totalVotes,
    transferAmount,
    transferDestinationIdentity,
    url,
  };
}

async function readContractProposals(
  contract: GovernanceContract,
  existingIds: Set<string>,
  openIds: Set<string>,
): Promise<Proposal[]> {
  const [activeResponse, inactiveResponse] = await Promise.all([
    queryContract<ContractIndexResponse>(contract.definition, "GetProposalIndices", {
      activeProposals: true,
      prevProposalIndex: -1,
    }),
    queryContract<ContractIndexResponse>(contract.definition, "GetProposalIndices", {
      activeProposals: false,
      prevProposalIndex: -1,
    }),
  ]);
  const activeIndex = new Set(activeResponse.indices.slice(0, activeResponse.numOfIndices));
  const inactiveIndex = new Set(inactiveResponse.indices.slice(0, inactiveResponse.numOfIndices));
  const indices = [...new Set([...activeIndex, ...inactiveIndex])];

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
  const existingIds = new Set(existing.map((proposal) => proposal.id));
  const proposals = (
    await Promise.all(
      CONTRACTS.map((contract) => readContractProposals(contract, existingIds, openIds)),
    )
  ).flat();
  return proposals.sort(
    (left, right) =>
      right.epoch - left.epoch ||
      left.contractIndex - right.contractIndex ||
      right.proposalIndex - left.proposalIndex,
  );
}
