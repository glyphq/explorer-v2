CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  contract_index INTEGER NOT NULL,
  contract_name TEXT NOT NULL,
  proposal_index INTEGER NOT NULL,
  epoch INTEGER NOT NULL,
  status INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  proposal_type TEXT NOT NULL,
  total_votes INTEGER NOT NULL,
  proposer_identity TEXT,
  transfer_destination_identity TEXT,
  transfer_amount TEXT,
  options_json TEXT NOT NULL,
  published_tick INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS proposals_status_epoch_idx
  ON proposals (status, epoch DESC);
