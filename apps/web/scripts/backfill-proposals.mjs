import { readFile, writeFile } from "node:fs/promises";

import {
  bytesToHex,
  decodeFunctionOutput,
  encodeFunctionInput,
  getContractDefinition,
  hexToBytes,
  publicKeyToIdentity,
} from "@glyph-oss/contracts";

const GLYPH_API = process.env.GLYPH_API_URL ?? "https://api.glyphq.org";
const ZERO_IDENTITY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB";
const QUORUM = 451;
const CONTRACTS = [
  { name: "GQMPROP", label: "General Quorum Proposal", type: "General options" },
  { name: "CCF", label: "Computor Controlled Fund", type: "Transfer" },
];
const STATUS = { PASSED: 3, REJECTED: 6, VOTING: 2, INCONCLUSIVE: 7 };
const OUTPUT_PATH = new URL("../src/lib/proposals-seed.json", import.meta.url);
const KV_KEY = "proposals:v2";
const LIST_KV_KEY = "proposals:list:v1";
const KV_NAMESPACE_ID = process.env.PROPOSALS_KV_NAMESPACE_ID;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

function kvUrl(key) {
  return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;
}

async function readKV() {
  if (!(KV_NAMESPACE_ID && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN)) {
    return null;
  }
  const response = await fetch(kvUrl(KV_KEY), {
    headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Reading ${KV_KEY} from KV returned ${response.status}.`);
  }
  return await response.json();
}

async function writeKV(proposals) {
  if (!(KV_NAMESPACE_ID && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN)) {
    console.error("Cloudflare KV credentials are not set; skipping the KV update.");
    return;
  }
  const active = proposals
    .filter((proposal) => proposal.status === 2)
    .sort(
      (left, right) =>
        right.epoch - left.epoch || (right.publishedTick ?? 0) - (left.publishedTick ?? 0),
    );
  const ended = proposals
    .filter((proposal) => proposal.status !== 2)
    .sort(
      (left, right) =>
        right.epoch - left.epoch || (right.publishedTick ?? 0) - (left.publishedTick ?? 0),
    );
  const list = JSON.stringify({ active, ended, source: "kv" });
  for (const [key, body] of [
    [KV_KEY, JSON.stringify(proposals)],
    [LIST_KV_KEY, list],
  ]) {
    const response = await fetch(kvUrl(key), {
      body,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`Writing ${key} to KV returned ${response.status}.`);
    }
  }
  console.error(`Wrote ${proposals.length} proposals to KV.`);
}

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

async function readTitle(url, proposalIndex, preferredTitle) {
  if (preferredTitle) {
    return preferredTitle;
  }
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

function optionCountForType(type) {
  return type & 0x00ff;
}

function proposalClass(type) {
  return type & 0xff00;
}

function transferDetails(type, data) {
  const bytes = Buffer.from(data ?? []);
  const optionCount = optionCountForType(type);
  if (proposalClass(type) === 0x400) {
    if (bytes.length < 42) {
      return {};
    }
    return {
      transferAmount: Number(bytes.readBigInt64LE(32)).toString(),
      transferDestinationIdentity: publicKeyToIdentity(bytes.subarray(0, 32)),
      transferTargetEpoch: bytes.readUInt16LE(40),
    };
  }
  if (proposalClass(type) !== 0x100 || bytes.length < 32) {
    return {};
  }
  const amounts = [];
  for (let index = 0; index < Math.max(0, optionCount - 1); index += 1) {
    const offset = 32 + index * 8;
    if (offset + 8 > bytes.length) {
      break;
    }
    amounts.push(Number(bytes.readBigInt64LE(offset)));
  }
  return {
    transferAmount: amounts[0] === undefined ? undefined : String(amounts[0]),
    transferAmounts: amounts,
    transferDestinationIdentity: publicKeyToIdentity(bytes.subarray(0, 32)),
  };
}

function optionLabels(type, details) {
  const optionCount = optionCountForType(type);
  const labels = [];
  const cls = proposalClass(type);
  if (cls === 0x100) {
    labels.push("No transfer");
    for (const amount of details.transferAmounts ?? []) {
      labels.push(`Send ${amount.toLocaleString("en-US")} QU`);
    }
  } else if (cls === 0x400) {
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

function proposalStatus(active, totalVotes, counts) {
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

function votingResults(response) {
  // The generated decoder misaligns this struct after the leading bit field.
  // The first entry of optionVoteCount is the total number of votes cast.
  const raw = response.results?.optionVoteCount ?? [];
  const totalVotes = Number(raw[0] ?? 0);
  return { counts: raw.slice(1).map(Number), totalVotes };
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
      ? { proposalIndex, subscriptionDestination: ZERO_IDENTITY }
      : { proposalIndex };
  const [{ proposal }, results] = await Promise.all([
    query(contract.name, "GetProposal", input),
    query(contract.name, "GetVotingResults", { proposalIndex }),
  ]);
  const url = bytesToString(proposal.url);
  const { counts, totalVotes } = votingResults(results);
  const type = proposal.type ?? (contract.name === "CCF" ? 258 : 2);
  const details = transferDetails(type, proposal.data);
  const labels = optionLabels(type, details);
  const options = labels.map((label, index) => ({
    index,
    label,
    numberOfVotes: counts[index] ?? 0,
  }));

  return {
    contractIndex: getContractDefinition(contract.name).index,
    contractName: contract.label,
    epoch: proposal.epoch,
    id: `${getContractDefinition(contract.name).index}:${proposalIndex}`,
    options,
    proposalIndex,
    proposalType: contract.type,
    proposerIdentity: proposal.proposerPubicKey,
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

function archivedCopy(proposal) {
  const publishedTick = proposal.publishedTick ?? 0;
  return {
    ...proposal,
    archived: true,
    id: `${proposal.contractIndex}:${proposal.proposalIndex}:${publishedTick}`,
    slug: String(publishedTick),
  };
}

async function main() {
  const previous = (await readKV()) ?? JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
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

  console.error(`Reading ${jobs.length} current proposals from ${GLYPH_API}.`);
  const current = await mapConcurrent(jobs, 6, async (job, index) => {
    if (index > 0 && index % 20 === 0) {
      console.error(`  ${index}/${jobs.length}`);
    }
    return readProposal(job.contract, job.proposalIndex, job.active);
  });

  const currentById = new Map(current.map((proposal) => [proposal.id, proposal]));
  const currentByTick = new Set(
    current.map((proposal) => `${proposal.contractIndex}:${proposal.publishedTick}`),
  );
  const archived = new Map();

  for (const proposal of previous) {
    if (proposal.archived) {
      archived.set(`${proposal.contractIndex}:${proposal.publishedTick}`, proposal);
      continue;
    }
    const replacement = currentById.get(proposal.id);
    if (!replacement || replacement.publishedTick !== proposal.publishedTick) {
      const copy = archivedCopy(proposal);
      archived.set(`${copy.contractIndex}:${copy.publishedTick}`, copy);
    }
  }

  const proposals = [...current];
  for (const [key, proposal] of archived) {
    if (!currentByTick.has(key)) {
      proposals.push(proposal);
    }
  }
  proposals.sort(
    (left, right) =>
      right.epoch - left.epoch ||
      left.contractIndex - right.contractIndex ||
      (right.publishedTick ?? 0) - (left.publishedTick ?? 0),
  );
  await writeFile(OUTPUT_PATH, `${JSON.stringify(proposals, null, 2)}\n`);
  console.error(`Wrote ${proposals.length} proposals to ${OUTPUT_PATH.pathname}.`);
  await writeKV(proposals);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
