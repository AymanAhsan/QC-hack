"""Shared parameterized wallet persistence for SQLite and Postgres."""

from dataclasses import replace

from data import WALLET

CARD_TEMPLATES = {card.id: card for card in WALLET}


class CardStore:
    placeholder = "?"

    def _card_sql(self, sql):
        return sql.replace("?", self.placeholder)

    def initialize_cards(self, connection):
        # Called inside the store's schema transaction. The marker prevents
        # deleted demo cards from reappearing when the app restarts.
        from pathlib import Path

        connection.execute((Path(__file__).with_name("migrations") / "003_cards.sql").read_text())
        marker = connection.execute(self._card_sql(
            "INSERT INTO persistence_metadata (key, value) VALUES ('demo_wallet_v1', 'done') "
            "ON CONFLICT (key) DO NOTHING RETURNING key"
        )).fetchone()
        if marker:
            for position, card in enumerate(WALLET):
                connection.execute(self._card_sql(
                    "INSERT INTO wallet_cards (user_id, id, type, last4, position) VALUES (?, ?, ?, ?, ?)"
                ), ("demo", card.id, card.type, card.last4, position))

    @staticmethod
    def _decode_card(row):
        user_id, card_id, card_type, last4 = row
        return replace(CARD_TEMPLATES[card_type], id=card_id, type=card_type, user_id=user_id, last4=last4)

    def list_cards(self, user_id):
        with self.connection() as connection:
            rows = connection.execute(self._card_sql(
                "SELECT user_id, id, type, last4 FROM wallet_cards WHERE user_id = ? ORDER BY position, id"
            ), (user_id,)).fetchall()
        return tuple(self._decode_card(row) for row in rows)

    def get_card(self, user_id, card_id):
        with self.connection() as connection:
            row = connection.execute(self._card_sql(
                "SELECT user_id, id, type, last4 FROM wallet_cards WHERE user_id = ? AND id = ?"
            ), (user_id, card_id)).fetchone()
        return self._decode_card(row) if row else None

    def create_card(self, user_id, card_id, card_type, last4):
        with self.connection() as connection:
            row = connection.execute(self._card_sql(
                "INSERT INTO wallet_cards (user_id, id, type, last4, position) "
                "SELECT ?, ?, ?, ?, COALESCE(MAX(position), -1) + 1 FROM wallet_cards WHERE user_id = ? "
                "RETURNING user_id, id, type, last4"
            ), (user_id, card_id, card_type, last4, user_id)).fetchone()
        return self._decode_card(row)

    def update_card(self, user_id, card_id, card_type, last4):
        with self.connection() as connection:
            row = connection.execute(self._card_sql(
                "UPDATE wallet_cards SET type = COALESCE(?, type), last4 = COALESCE(?, last4) "
                "WHERE user_id = ? AND id = ? RETURNING user_id, id, type, last4"
            ), (card_type, last4, user_id, card_id)).fetchone()
        return self._decode_card(row) if row else None

    def delete_card(self, user_id, card_id):
        with self.connection() as connection:
            row = connection.execute(self._card_sql(
                "DELETE FROM wallet_cards WHERE user_id = ? AND id = ? RETURNING id"
            ), (user_id, card_id)).fetchone()
        return row is not None
