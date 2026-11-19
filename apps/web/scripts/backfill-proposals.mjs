import { writeFile } from "node:fs/promises";

import {
  bytesToHex,
  decodeFunctionOutput,
  encodeFunctionInput,
  getContractDefinition,
  hexToBytes,
  publicKeyToIdentity,
} from "@glyph-oss/contracts";

const GLYPH_API = process.env.GLYPH_API_URL ?? "https://api.glyphq.org";
const BURN_IDENTITY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB";
const CONTRACTS = [
  { name: "GQMPROP", label: "General Quorum Proposal", type: "General options" },
  { name: "CCF", label: "Computor Controlled Fund", type: "Transfer" },
];
const STATUS = { PASSED: 3, REJECTED: 6, VOTING: 2, INCONCLUSIVE: 7 };
const OUTPUT_PATH = new URL("../src/lib/proposals-seed.json", import.meta.url);

async function query(contractName, functionName, input) {
  const contract = getContractDefinition(contractName);
  const fn = contract.functions.find((candidate) => candidate.name === functionName);
  if (!fn) {
    throw new Error(`${contractName}.${functionName} is not in the ABI.`);
  }
  const encoded = encodeFunctionInput(contract, fn.inputType, input);
  const response = await fetch(`${GLYPH_API}/v1/live/contracts/${contract.index}/query`, {
    body: JSON.stringify({ input: bytesToHex(encoded.payload), input_type: fn.inputType }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`${contractName}.${functionName} returned ${response.status}.`);
  }
  const body = await response.json();
  return decodeFunctionOutput(contract, fn.inputType, hexToBytes(body.data.output), {
    enumFormat: "name",
  });
}

function bytesToString(bytes) {
  const data = Buffer.from(bytes ?? []);
  const end = data.indexOf(0);
  return data.subarray(0, end === -1 ? data.length : end).toString("utf8");
}

function githubRawUrl(url) {
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

function cleanTitle(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function fallbackTitle(url, proposalIndex) {
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

const titleCache = new Map();

async function readTitle(url, proposalIndex) {
  const fallback = fallbackTitle(url, proposalIndex);
  const rawUrl = githubRawUrl(url);
  if (!rawUrl) {
    return fallback;
  }
  if (titleCache.has(rawUrl)) {
    return titleCache.get(rawUrl);
  }
  try {
    const response = await fetch(rawUrl);
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

function optionCounts(response) {
  const counts = response.results?.optionVoteCount ?? [];
  return [Number(counts[1] ?? 0), Number(counts[2] ?? 0)];
}

async function readProposalIndices(contractName, activeProposals) {
  const indices = [];
  let previousIndex = -1;

  for (let page = 0; page < 32; page += 1) {
    const response = await query(contractName, "GetProposalIndices", {
      activeProposals,
      prevProposalIndex: previousIndex,
    });
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

async function readProposal(contract, proposalIndex, active) {
  const input =
    contract.name === "CCF"
      ? { proposalIndex, subscriptionDestination: BURN_IDENTITY }
      : { proposalIndex };
  const [{ proposal }, results] = await Promise.all([
    query(contract.name, "GetProposal", input),
    query(contract.name, "GetVotingResults", { proposalIndex }),
  ]);
  const url = bytesToString(proposal.url);
  const counts = optionCounts(results);
  const totalVotes = counts.reduce((sum, count) => sum + count, 0);
  const passed = counts[1] > counts[0];
  const tie = counts[0] === counts[1];
  const status = active
    ? STATUS.VOTING
    : totalVotes === 0 || tie
      ? STATUS.INCONCLUSIVE
      : passed
        ? STATUS.PASSED
        : STATUS.REJECTED;

  let transferDestinationIdentity;
  let transferAmount;
  if (contract.name === "CCF" && proposal.data) {
    const data = Buffer.from(proposal.data);
    if (data.length >= 40) {
      transferDestinationIdentity = publicKeyToIdentity(data.subarray(0, 32));
      transferAmount = data.readBigUInt64LE(32).toString();
    }
  }

  const optionLabels =
    contract.name === "CCF" && transferAmount
      ? ["No transfer", `Send ${Number(transferAmount).toLocaleString("en-US")} QU`]
      : ["No", "Yes"];

  return {
    contractIndex: getContractDefinition(contract.name).index,
    contractName: contract.label,
    epoch: proposal.epoch,
    id: `${getContractDefinition(contract.name).index}:${proposalIndex}`,
    options: optionLabels.map((label, index) => ({
      index,
      label,
      numberOfVotes: counts[index],
    })),
    proposalIndex,
    proposalType: contract.type,
    proposerIdentity: proposal.proposerPubicKey,
    publishedTick: proposal.tick,
    status,
    title: await readTitle(url, proposalIndex),
    totalVotes,
    transferAmount,
    transferDestinationIdentity,
    url,
  };
}

async function mapConcurrent(items, limit, mapper) {
  const output = Array.from({ length: items.length });
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

async function main() {
  const jobs = [];
  for (const contract of CONTRACTS) {
    const [activeIndices, inactiveIndices] = await Promise.all([
      readProposalIndices(contract.name, true),
      readProposalIndices(contract.name, false),
    ]);
    const activeSet = new Set(activeIndices);
    const indices = [...new Set([...activeIndices, ...inactiveIndices])];
    for (const proposalIndex of indices) {
      jobs.push({ active: activeSet.has(proposalIndex), contract, proposalIndex });
    }
  }

  console.error(`Reading ${jobs.length} proposals from ${GLYPH_API}.`);
  const proposals = await mapConcurrent(jobs, 6, async (job, index) => {
    if (index > 0 && index % 20 === 0) {
      console.error(`  ${index}/${jobs.length}`);
    }
    return readProposal(job.contract, job.proposalIndex, job.active);
  });
  proposals.sort(
    (left, right) =>
      right.epoch - left.epoch ||
      left.contractIndex - right.contractIndex ||
      right.proposalIndex - left.proposalIndex,
  );
  await writeFile(OUTPUT_PATH, `${JSON.stringify(proposals, null, 2)}\n`);
  console.error(`Wrote ${proposals.length} proposals to ${OUTPUT_PATH.pathname}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
