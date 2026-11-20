-- Optional social profile links, stored as a JSON object keyed by platform.
ALTER TABLE profiles ADD COLUMN socials TEXT NOT NULL DEFAULT '{}';
