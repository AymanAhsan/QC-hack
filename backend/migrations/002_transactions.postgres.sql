-- Tiger Data / Postgres history. Money is integer cents, matching the API contract.
-- The hypertable step runs separately (db.py) only when TimescaleDB is installed.
CREATE TABLE IF NOT EXISTS persistence_schema_versions (
    version INTEGER PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    idempotency_key TEXT NOT NULL,
    merchant_id TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    category TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('store', 'online')),
    source TEXT NOT NULL,
    subtotal_cents BIGINT NOT NULL CHECK (subtotal_cents > 0),
    shipping_cents BIGINT CHECK (shipping_cents >= 0),
    coupon_code TEXT,
    coupon_savings_cents BIGINT NOT NULL CHECK (coupon_savings_cents >= 0),
    amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
    card_used_id TEXT NOT NULL,
    best_card_id TEXT,
    earned_cents BIGINT NOT NULL CHECK (earned_cents >= 0),
    best_possible_cents BIGINT NOT NULL CHECK (best_possible_cents >= 0),
    missed_cents BIGINT NOT NULL CHECK (missed_cents = GREATEST(best_possible_cents - earned_cents, 0)),
    points_earned BIGINT,
    request_hash TEXT NOT NULL,
    PRIMARY KEY (id, ts)
);
CREATE INDEX IF NOT EXISTS transactions_ts_idx ON transactions (ts DESC, id);
-- Hypertable unique keys must include ts, so this plain table enforces one row
-- per idempotency key across timestamps and concurrent retries.
CREATE TABLE IF NOT EXISTS transaction_requests (
    idempotency_key TEXT PRIMARY KEY,
    id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    request_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS persistence_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT INTO persistence_schema_versions (version) VALUES (2) ON CONFLICT DO NOTHING;
