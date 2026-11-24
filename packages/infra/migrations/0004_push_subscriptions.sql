-- Browser push subscriptions for BPP-9000 call notifications.
--
-- A subscription is a device-level capability: the endpoint plus the
-- client's ECDH public key and auth secret. There are no accounts, so the
-- same browser profile maps to exactly one row.
--
-- bpp_notification_state tracks the last announced hour and which delivery
-- channels have already handled it. A late subscriber must never receive a
-- call from an earlier hour, and a failed push can retry without posting to
-- Discord twice.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_success_at INTEGER,
  failure_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bpp_notification_state (
  id TEXT PRIMARY KEY,
  epoch INTEGER NOT NULL,
  hour INTEGER NOT NULL,
  said TEXT NOT NULL,
  target_unix INTEGER NOT NULL,
  push_done INTEGER NOT NULL DEFAULT 0,
  discord_done INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
