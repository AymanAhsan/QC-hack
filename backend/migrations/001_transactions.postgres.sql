CREATE TABLE IF NOT EXISTS persistence_schema_versions (
    version INTEGER PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS transactions (
    id UUID NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    merchant TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    card_used TEXT NOT NULL,
    best_card TEXT NOT NULL,
    earned NUMERIC(10,2) NOT NULL CHECK (earned >= 0),
    best_possible NUMERIC(10,2) NOT NULL CHECK (best_possible >= 0),
    missed NUMERIC(10,2) NOT NULL CHECK (
        missed = GREATEST(best_possible - earned, 0)
    ),
    channel TEXT NOT NULL CHECK (channel IN ('store', 'online')),
    request_hash TEXT NOT NULL,
    PRIMARY KEY (id, ts)
);
SELECT create_hypertable('transactions', by_range('ts'), if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS transactions_ts_idx ON transactions (ts DESC, id);
-- Hypertable uniqueness must include the partition key. This regular table
-- enforces a request ID's uniqueness across timestamps and concurrent retries.
CREATE TABLE IF NOT EXISTS transaction_requests (
    id UUID PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL,
    request_hash TEXT NOT NULL
);
INSERT INTO persistence_schema_versions (version) VALUES (1) ON CONFLICT DO NOTHING;
