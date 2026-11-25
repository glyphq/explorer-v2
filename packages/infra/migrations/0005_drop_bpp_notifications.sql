-- BPP-9000 and its notification pipeline were removed. Drop the tables that
-- only existed to store Web Push subscriptions and announce call/result state.

DROP TABLE IF EXISTS bpp_notification_state;
DROP TABLE IF EXISTS push_subscriptions;
