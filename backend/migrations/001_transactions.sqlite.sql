CREATE TABLE IF NOT EXISTS persistence_schema_versions (
    version INTEGER PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    card_used TEXT NOT NULL,
    best_card TEXT NOT NULL,
    earned_cents INTEGER NOT NULL CHECK (earned_cents >= 0),
    best_possible_cents INTEGER NOT NULL CHECK (best_possible_cents >= 0),
    missed_cents INTEGER NOT NULL CHECK (
        missed_cents = MAX(best_possible_cents - earned_cents, 0)
    ),
    channel TEXT NOT NULL CHECK (channel IN ('store', 'online')),
    request_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS transactions_ts_idx ON transactions (ts DESC, id);
CREATE TABLE IF NOT EXISTS persistence_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT OR IGNORE INTO persistence_schema_versions (version) VALUES (1);
