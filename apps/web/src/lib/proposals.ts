import seed from "./proposals-seed.json";

import { readChangedProposals } from "./proposals-chain";

export type ProposalOption = {
  index: number;
  label: string;
  numberOfVotes: number;
};

export type Proposal = {
  contractIndex: number;
  contractName: string;
  epoch: number;
  id: string;
  options: ProposalOption[];
  proposalIndex: number;
  proposalType: string;
  proposerIdentity?: string;
  publishedTick?: number;
  status: number;
  title: string;
  totalVotes: number;
  transferAmount?: string;
  transferDestinationIdentity?: string;
  url?: string;
};

type ProposalRow = {
  contract_index: number;
  contract_name: string;
  epoch: number;
  id: string;
  options_json: string;
  proposal_index: number;
  proposal_type: string;
  proposer_identity: string | null;
  published_tick: number | null;
  status: number;
  title: string;
  total_votes: number;
  transfer_amount: string | null;
  transfer_destination_identity: string | null;
  url: string | null;
};

type SeedProposal = Omit<Proposal, "proposerIdentity" | "publishedTick" | "url"> & {
  proposerIdentity?: string;
  publishedTick?: number;
  url?: string;
};

const seedProposals = seed as SeedProposal[];

let databasePromise: Promise<D1Database | null> | null = null;
let lastSyncAt = 0;

const SYNC_INTERVAL_MS = 5 * 60_000;

async function proposalsDatabase(): Promise<D1Database | null> {
  databasePromise ??= (async () => {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const context = await getCloudflareContext({ async: true });
      return context.env.PROPOSALS_DB ?? null;
    } catch {
      return null;
    }
  })();
  return databasePromise;
}

function fromRow(row: ProposalRow): Proposal {
  return {
    contractIndex: row.contract_index,
    contractName: row.contract_name,
    epoch: row.epoch,
    id: row.id,
    options: JSON.parse(row.options_json) as ProposalOption[],
    proposalIndex: row.proposal_index,
    proposalType: row.proposal_type,
    proposerIdentity: row.proposer_identity ?? undefined,
    publishedTick: row.published_tick ?? undefined,
    status: row.status,
    title: row.title,
    totalVotes: row.total_votes,
    transferAmount: row.transfer_amount ?? undefined,
    transferDestinationIdentity: row.transfer_destination_identity ?? undefined,
    url: row.url ?? undefined,
  };
}

function insertStatement(database: D1Database, proposal: Proposal): D1PreparedStatement {
  return database
    .prepare(
      `INSERT OR REPLACE INTO proposals (
        contract_index, contract_name, epoch, id, options_json, proposal_index,
        proposal_type, proposer_identity, published_tick, status, title,
        total_votes, transfer_amount, transfer_destination_identity, url, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      proposal.contractIndex,
      proposal.contractName,
      proposal.epoch,
      proposal.id,
      JSON.stringify(proposal.options),
      proposal.proposalIndex,
      proposal.proposalType,
      proposal.proposerIdentity ?? null,
      proposal.publishedTick ?? null,
      proposal.status,
      proposal.title,
      proposal.totalVotes,
      proposal.transferAmount ?? null,
      proposal.transferDestinationIdentity ?? null,
      proposal.url ?? null,
      Date.now(),
    );
}

async function upsertProposals(database: D1Database, proposals: Proposal[]): Promise<void> {
  const statements = proposals.map((proposal) => insertStatement(database, proposal));
  for (let index = 0; index < statements.length; index += 50) {
    await database.batch(statements.slice(index, index + 50));
  }
}

async function seedDatabase(database: D1Database): Promise<void> {
  await upsertProposals(database, seedProposals);
}

async function readRows(database: D1Database): Promise<Proposal[]> {
  const { results } = await database
    .prepare("SELECT * FROM proposals ORDER BY epoch DESC, contract_index ASC, proposal_index DESC")
    .all<ProposalRow>();
  return results.map(fromRow);
}

async function syncDatabase(database: D1Database, existing: Proposal[]): Promise<Proposal[]> {
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
  await upsertProposals(database, changed);
  return readRows(database);
}

function byNewest(left: Proposal, right: Proposal): number {
  return right.epoch - left.epoch || right.proposalIndex - left.proposalIndex;
}

export async function getProposalByRoute(
  contract: string,
  proposalIndex: number,
): Promise<Proposal | undefined> {
  const contractIndex =
    contract.toLowerCase() === "gqmprop" ? 6 : contract.toLowerCase() === "ccf" ? 8 : undefined;
  if (!contractIndex || !Number.isInteger(proposalIndex)) {
    return undefined;
  }
  const proposals = await getProposals();
  return [...proposals.active, ...proposals.ended].find(
    (proposal) =>
      proposal.contractIndex === contractIndex && proposal.proposalIndex === proposalIndex,
  );
}

export async function getProposals(): Promise<{
  active: Proposal[];
  ended: Proposal[];
  source: "database" | "seed";
}> {
  const database = await proposalsDatabase();
  if (database) {
    try {
      const count = await database
        .prepare("SELECT COUNT(*) AS count FROM proposals")
        .first<{ count: number }>();
      if ((count?.count ?? 0) === 0) {
        await seedDatabase(database);
      }
      let proposals = await readRows(database);
      if (proposals.length > 0) {
        try {
          proposals = await syncDatabase(database, proposals);
        } catch {
          // Keep serving the stored snapshot when the live chain query is unavailable.
        }
        return {
          active: proposals.filter((proposal) => proposal.status === 2).sort(byNewest),
          ended: proposals.filter((proposal) => proposal.status !== 2).sort(byNewest),
          source: "database",
        };
      }
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
