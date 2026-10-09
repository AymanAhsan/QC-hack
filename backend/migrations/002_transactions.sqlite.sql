-- Local SQLite history. Same columns and units as the Postgres schema.
CREATE TABLE IF NOT EXISTS persistence_schema_versions (
    version INTEGER PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,  -- UTC ISO 8601 with fixed microsecond precision, so text order = time order
    idempotency_key TEXT NOT NULL UNIQUE,
    merchant_id TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    category TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('store', 'online')),
    source TEXT NOT NULL,
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents > 0),
    shipping_cents INTEGER CHECK (shipping_cents >= 0),
    coupon_code TEXT,
    coupon_savings_cents INTEGER NOT NULL CHECK (coupon_savings_cents >= 0),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    card_used_id TEXT NOT NULL,
    best_card_id TEXT,
    earned_cents INTEGER NOT NULL CHECK (earned_cents >= 0),
    best_possible_cents INTEGER NOT NULL CHECK (best_possible_cents >= 0),
    missed_cents INTEGER NOT NULL CHECK (missed_cents = MAX(best_possible_cents - earned_cents, 0)),
    points_earned INTEGER,
    request_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS transactions_ts_idx ON transactions (ts DESC, id);
CREATE TABLE IF NOT EXISTS persistence_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT OR IGNORE INTO persistence_schema_versions (version) VALUES (2);
