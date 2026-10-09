CREATE TABLE IF NOT EXISTS wallet_cards (
    user_id TEXT NOT NULL CHECK (length(user_id) BETWEEN 1 AND 64),
    id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'amex-gold', 'chase-sapphire', 'chase-freedom',
        'venture-x', 'apple-card', 'everyday-debit'
    )),
    last4 TEXT NOT NULL CHECK (length(last4) = 4),
    position INTEGER NOT NULL,
    PRIMARY KEY (user_id, id)
);
