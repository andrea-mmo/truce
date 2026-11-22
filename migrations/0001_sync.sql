-- One row per person (Access email): salt for the passphrase and an encrypted
-- check value, so a second device can tell a wrong passphrase.
CREATE TABLE IF NOT EXISTS sync_users (
  email TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  verifier_iv TEXT NOT NULL,
  verifier TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Encrypted records. `seq` orders changes for "give me what's new".
-- `modified_at` (device time) decides conflicts: the newest change wins.
CREATE TABLE IF NOT EXISTS sync_records (
  email TEXT NOT NULL,
  store TEXT NOT NULL,
  id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  modified_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  iv TEXT,
  data TEXT,
  PRIMARY KEY (email, store, id)
);
CREATE INDEX IF NOT EXISTS idx_sync_records_seq ON sync_records (email, seq);

CREATE TABLE IF NOT EXISTS sync_counters (
  email TEXT PRIMARY KEY,
  seq INTEGER NOT NULL
);
