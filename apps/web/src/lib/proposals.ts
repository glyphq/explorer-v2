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
const LIST_STORAGE_KEY = "proposals:list:v1";
const SNAPSHOT_CACHE_MS = 30_000;

let kvPromise: Promise<KVNamespace | null> | null = null;
let snapshotCache: { at: number; value: ProposalSnapshot } | null = null;

export type ProposalSnapshot = {
  active: Proposal[];
  ended: Proposal[];
  source: "kv" | "seed";
};

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

function byNewest(left: Proposal, right: Proposal): number {
  return right.epoch - left.epoch || (right.publishedTick ?? 0) - (left.publishedTick ?? 0);
}

function toSnapshot(proposals: Proposal[], source: ProposalSnapshot["source"]): ProposalSnapshot {
  return {
    active: proposals.filter((proposal) => proposal.status === 2).sort(byNewest),
    ended: proposals.filter((proposal) => proposal.status !== 2).sort(byNewest),
    source,
  };
}

async function seedSnapshot(): Promise<ProposalSnapshot> {
  const { default: seed } = await import("./proposals-seed.json");
  return toSnapshot(seed as SeedProposal[], "seed");
}

/**
 * Reads the proposal snapshot maintained by the hourly proposals-sync
 * workflow. Workers never query the chain or backfill KV during a request.
 */
export async function getProposals(): Promise<ProposalSnapshot> {
  if (snapshotCache && Date.now() - snapshotCache.at < SNAPSHOT_CACHE_MS) {
    return snapshotCache.value;
  }

  const kv = await proposalsKV();
  if (kv) {
    try {
      const proposals = await readStored(kv);
      if (proposals) {
        const value = toSnapshot(proposals, "kv");
        snapshotCache = { at: Date.now(), value };
        return value;
      }
    } catch {
      // Fall back to the bundled on-chain snapshot if the binding is unavailable.
    }
  }

  const value = await seedSnapshot();
  snapshotCache = { at: Date.now(), value };
  return value;
}

/** Returns the pre-serialized list response written by the sync workflow. */
export async function getProposalListJson(): Promise<string | null> {
  const kv = await proposalsKV();
  if (!kv) {
    return null;
  }
  try {
    return await kv.get(LIST_STORAGE_KEY);
  } catch {
    return null;
  }
}
