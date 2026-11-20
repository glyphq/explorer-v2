-- Verified profiles and short-lived ownership challenges.
-- Timestamps are Unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS profiles (
  identity TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  website TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('wallet', 'exchange')),
  source TEXT NOT NULL,
  verified_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_challenges (
  id TEXT PRIMARY KEY,
  identity TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('claim', 'revoke')),
  message TEXT NOT NULL,
  domain TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_profiles_kind ON profiles (kind);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles (updated_at);
CREATE INDEX IF NOT EXISTS idx_profile_challenges_identity_action
  ON profile_challenges (identity, action);
CREATE INDEX IF NOT EXISTS idx_profile_challenges_expires_at
  ON profile_challenges (expires_at);
