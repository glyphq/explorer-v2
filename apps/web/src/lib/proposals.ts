import seed from "./proposals-seed.json";

import { readChangedProposals } from "./proposals-chain";

export type ProposalOption = {
  index: number;
  label: string;
  numberOfVotes: number;
};

export type Proposal = {
  archived?: boolean;
  contractIndex: number;
  contractName: string;
  epoch: number;
  id: string;
  options: ProposalOption[];
  proposalIndex: number;
  proposalType: string;
  proposerIdentity?: string;
  publishedTick?: number;
  slug?: string;
  status: number;
  title: string;
  totalVotes: number;
  transferAmount?: string;
  transferDestinationIdentity?: string;
  url?: string;
};

type SeedProposal = Omit<Proposal, "proposerIdentity" | "publishedTick" | "url"> & {
  proposerIdentity?: string;
  publishedTick?: number;
  url?: string;
};

const STORAGE_KEY = "proposals:v2";
const seedProposals = seed as SeedProposal[];

let kvPromise: Promise<KVNamespace | null> | null = null;
let lastSyncAt = 0;

const SYNC_INTERVAL_MS = 5 * 60_000;

async function proposalsKV(): Promise<KVNamespace | null> {
  kvPromise ??= (async () => {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const context = await getCloudflareContext({ async: true });
      return context.env.PROPOSALS_KV ?? null;
    } catch {
      return null;
    }
  })();
  return kvPromise;
}

async function readStored(kv: KVNamespace): Promise<Proposal[] | null> {
  const rows = await kv.get<Proposal[]>(STORAGE_KEY, "json");
  return Array.isArray(rows) && rows.length > 0 ? rows : null;
}

async function writeStored(kv: KVNamespace, proposals: Proposal[]): Promise<void> {
  await kv.put(STORAGE_KEY, JSON.stringify(proposals));
}

async function syncSnapshot(kv: KVNamespace, existing: Proposal[]): Promise<Proposal[]> {
  if (Date.now() - lastSyncAt < SYNC_INTERVAL_MS) {
    return existing;
  }
  lastSyncAt = Date.now();

  const openIds = new Set(
    existing.filter((proposal) => proposal.status === 2).map((proposal) => proposal.id),
  );
  const changed = await readChangedProposals(existing, openIds);
  if (changed.length === 0) {
    return existing;
  }

  const byId = new Map(existing.map((proposal) => [proposal.id, proposal]));
  for (const proposal of changed) {
    byId.set(proposal.id, proposal);
  }
  const proposals = [...byId.values()];
  await writeStored(kv, proposals);
  return proposals;
}

function byNewest(left: Proposal, right: Proposal): number {
  return right.epoch - left.epoch || (right.publishedTick ?? 0) - (left.publishedTick ?? 0);
}

export async function getProposalByRoute(
  contract: string,
  route: string,
): Promise<Proposal | undefined> {
  const contractIndex =
    contract.toLowerCase() === "gqmprop" ? 6 : contract.toLowerCase() === "ccf" ? 8 : undefined;
  if (!contractIndex) {
    return undefined;
  }
  const proposals = await getProposals();
  return [...proposals.active, ...proposals.ended].find(
    (proposal) =>
      proposal.contractIndex === contractIndex &&
      (proposal.slug ? proposal.slug === route : String(proposal.proposalIndex) === route),
  );
}

export async function getProposals(): Promise<{
  active: Proposal[];
  ended: Proposal[];
  source: "kv" | "seed";
}> {
  const kv = await proposalsKV();
  if (kv) {
    try {
      let proposals = await readStored(kv);
      if (!proposals) {
        proposals = seedProposals;
        await writeStored(kv, proposals);
      }
      try {
        proposals = await syncSnapshot(kv, proposals);
      } catch {
        // Keep serving the stored snapshot when the live chain query is unavailable.
      }
      return {
        active: proposals.filter((proposal) => proposal.status === 2).sort(byNewest),
        ended: proposals.filter((proposal) => proposal.status !== 2).sort(byNewest),
        source: "kv",
      };
    } catch {
      // Fall back to the bundled on-chain snapshot if the binding is unavailable.
    }
  }

  return {
    active: seedProposals.filter((proposal) => proposal.status === 2).sort(byNewest),
    ended: seedProposals.filter((proposal) => proposal.status !== 2).sort(byNewest),
    source: "seed",
  };
}
