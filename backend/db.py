"""Transaction history: Tiger Data (Postgres + TimescaleDB) or local SQLite.

Owner: Ayman (adapted to the docs/API.md contract during integration).

Module interface used by main.py and the routers:
- init(): open the configured database once, migrate, and seed demo history.
- mode(): "timescale" | "postgres" | "sqlite" | "sqlite-fallback".
- get_db(): the open Database (FastAPI dependency).

Database selection happens once, at startup:
- No DATABASE_URL: SQLite at SQLITE_PATH.
- DATABASE_URL set and reachable: Postgres, with a hypertable when TimescaleDB is installed.
- DATABASE_URL set but unreachable: startup fails, unless ALLOW_SQLITE_FALLBACK=true,
  in which case SQLite is used and mode() reports "sqlite-fallback".
After startup the database never switches. A failed read or write raises
DatabaseUnavailable (HTTP 503) and nothing is reported as saved.

No reward maths lives here; every value arrives already computed by engine.py.
"""

from __future__ import annotations

import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import RLock
from typing import Iterable

from config import settings
from card_store import CardStore
from data import CATEGORY_LABELS
from persistence_models import COLUMNS, DatabaseUnavailable, IdempotencyConflict, Transaction, utc_time

LOGGER = logging.getLogger("uvicorn.error")
MIGRATIONS = Path(__file__).with_name("migrations")
FIELDS = ", ".join(COLUMNS)
SEED_KEY = "demo_seed_v2"


def _ts_text(value: datetime) -> str:
    # Fixed precision and UTC are essential for SQLite lexical range queries.
    return utc_time(value).isoformat(timespec="microseconds")


def _decode(row, *, sqlite: bool) -> Transaction:
    values = dict(zip(COLUMNS, row))
    values["id"] = str(values["id"])
    if sqlite:
        values["ts"] = datetime.fromisoformat(values["ts"])
    for name in ("subtotal_cents", "shipping_cents", "coupon_savings_cents", "amount_cents",
                 "earned_cents", "best_possible_cents", "missed_cents", "points_earned"):
        if values[name] is not None:
            values[name] = int(values[name])
    return Transaction(**values)


def _encode(transaction: Transaction, *, sqlite: bool) -> tuple:
    values = [getattr(transaction, name) for name in COLUMNS]
    if sqlite:
        values[COLUMNS.index("ts")] = _ts_text(transaction.ts)
    return tuple(values)


def _check_retry(existing: Transaction, candidate: Transaction) -> tuple[Transaction, bool]:
    if existing.request_hash != candidate.request_hash:
        raise IdempotencyConflict("This idempotency key was already used for a different purchase.")
    return existing, existing.id != candidate.id


# --------------------------------------------------------------------------- SQLite


class SQLiteStore(CardStore):
    def __init__(self, path: str | Path):
        self.path = str(path)
        if self.path == ":memory:":
            raise ValueError("Use a file-backed SQLite database for durable persistence")
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connection(self):
        connection = sqlite3.connect(self.path, timeout=10)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connection() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            columns = {row[1] for row in connection.execute("PRAGMA table_info(transactions)")}
            if columns and "idempotency_key" not in columns:
                # Pre-contract (v1) table from an earlier branch: keep it, out of the way.
                connection.execute("ALTER TABLE transactions RENAME TO transactions_v1_legacy")
                connection.execute("DROP INDEX IF EXISTS transactions_ts_idx")
            connection.executescript((MIGRATIONS / "002_transactions.sqlite.sql").read_text())
            connection.execute("BEGIN IMMEDIATE")
            self.initialize_cards(connection)

    def get_by_key(self, key: str) -> Transaction | None:
        with self.connection() as connection:
            row = connection.execute(f"SELECT {FIELDS} FROM transactions WHERE idempotency_key = ?", (key,)).fetchone()
        return _decode(row, sqlite=True) if row else None

    def save(self, transaction: Transaction) -> tuple[Transaction, bool]:
        placeholders = ",".join("?" * len(COLUMNS))
        with self.connection() as connection:
            connection.execute(
                f"INSERT INTO transactions ({FIELDS}) VALUES ({placeholders}) ON CONFLICT(idempotency_key) DO NOTHING",
                _encode(transaction, sqlite=True),
            )
            row = connection.execute(
                f"SELECT {FIELDS} FROM transactions WHERE idempotency_key = ?", (transaction.idempotency_key,)
            ).fetchone()
        return _check_retry(_decode(row, sqlite=True), transaction)

    def seed_if_empty(self, transactions: Iterable[Transaction]) -> bool:
        placeholders = ",".join("?" * len(COLUMNS))
        with self.connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            if connection.execute("SELECT 1 FROM persistence_metadata WHERE key = ?", (SEED_KEY,)).fetchone():
                return False
            empty = not connection.execute("SELECT 1 FROM transactions LIMIT 1").fetchone()
            if empty:
                connection.executemany(
                    f"INSERT INTO transactions ({FIELDS}) VALUES ({placeholders})",
                    [_encode(t, sqlite=True) for t in transactions],
                )
            connection.execute("INSERT INTO persistence_metadata (key, value) VALUES (?, 'done')", (SEED_KEY,))
            return empty

    def aggregate(self, start: datetime, end: datetime, limit: int) -> dict:
        bounds = (_ts_text(start), _ts_text(end))
        where = "WHERE ts >= ? AND ts <= ?"
        with self.connection() as connection:
            # One snapshot for every query, even if a payment lands mid-read.
            connection.execute("BEGIN")
            totals = connection.execute(
                "SELECT COALESCE(SUM(missed_cents),0), COALESCE(SUM(earned_cents),0), "
                f"COALESCE(SUM(best_possible_cents),0), COUNT(*) FROM transactions {where}",
                bounds,
            ).fetchone()
            daily = connection.execute(
                f"SELECT substr(ts,1,10), SUM(missed_cents), SUM(earned_cents), COUNT(*) FROM transactions {where} "
                "GROUP BY 1 ORDER BY 1",
                bounds,
            ).fetchall()
            categories = connection.execute(
                f"SELECT category, SUM(missed_cents) FROM transactions {where} "
                "GROUP BY category ORDER BY SUM(missed_cents) DESC, category",
                bounds,
            ).fetchall()
            rows = connection.execute(
                f"SELECT {FIELDS} FROM transactions {where} ORDER BY ts DESC, id DESC LIMIT ?", (*bounds, limit)
            ).fetchall()
        return {
            "totals": totals,
            "daily": [(str(d), m, e, c) for d, m, e, c in daily],
            "categories": categories,
            "recent": [_decode(r, sqlite=True) for r in rows],
        }


# --------------------------------------------------------------------------- Postgres / Tiger Data


class PostgresStore(CardStore):
    placeholder = "%s"

    def __init__(self, database_url: str):
        import psycopg  # Imported only when configured.

        self.connect = psycopg.connect
        self.database_url = database_url
        self.timescale = False

    @contextmanager
    def connection(self):
        with self.connect(self.database_url, connect_timeout=3, options="-c statement_timeout=5000") as connection:
            yield connection

    def initialize(self) -> None:
        with self.connection() as connection:
            # Serializes schema setup across several app workers.
            connection.execute("SELECT pg_advisory_xact_lock(82491631)")
            for table, key in (("transactions", "idempotency_key"), ("transaction_requests", "idempotency_key")):
                columns = {
                    r[0]
                    for r in connection.execute(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_schema = current_schema() AND table_name = %s",
                        (table,),
                    )
                }
                if columns and key not in columns:
                    # Pre-contract (v1) tables from an earlier branch: keep them, out of the way.
                    legacy = f"{table}_v1_legacy"
                    connection.execute(f"ALTER TABLE {table} RENAME TO {legacy}")
                    connection.execute(f"ALTER INDEX IF EXISTS {table}_pkey RENAME TO {legacy}_pkey")
                    connection.execute(f"ALTER INDEX IF EXISTS {table}_ts_idx RENAME TO {legacy}_ts_idx")
            connection.execute((MIGRATIONS / "002_transactions.postgres.sql").read_text())
            self.initialize_cards(connection)
            self.timescale = bool(
                connection.execute("SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'").fetchone()
            )
            if self.timescale:
                connection.execute("SELECT create_hypertable('transactions', by_range('ts'), if_not_exists => TRUE)")

    def _insert(self, connection, transaction: Transaction) -> tuple[Transaction, bool]:
        connection.execute(
            "INSERT INTO transaction_requests (idempotency_key, id, ts, request_hash) VALUES (%s,%s,%s,%s) "
            "ON CONFLICT (idempotency_key) DO NOTHING",
            (transaction.idempotency_key, transaction.id, transaction.ts, transaction.request_hash),
        )
        registry = connection.execute(
            "SELECT id, ts, request_hash FROM transaction_requests WHERE idempotency_key = %s FOR UPDATE",
            (transaction.idempotency_key,),
        ).fetchone()
        if registry[2] != transaction.request_hash:
            raise IdempotencyConflict("This idempotency key was already used for a different purchase.")
        if registry[0] == transaction.id:
            placeholders = ",".join(["%s"] * len(COLUMNS))
            connection.execute(
                f"INSERT INTO transactions ({FIELDS}) VALUES ({placeholders}) ON CONFLICT (id, ts) DO NOTHING",
                _encode(transaction, sqlite=False),
            )
        row = connection.execute(
            f"SELECT {FIELDS} FROM transactions WHERE id = %s AND ts = %s", (registry[0], registry[1])
        ).fetchone()
        stored = _decode(row, sqlite=False)
        return stored, stored.id != transaction.id

    def get_by_key(self, key: str) -> Transaction | None:
        with self.connection() as connection:
            row = connection.execute(
                f"SELECT {', '.join('t.' + c for c in COLUMNS)} FROM transaction_requests r "
                "JOIN transactions t ON t.id = r.id AND t.ts = r.ts WHERE r.idempotency_key = %s",
                (key,),
            ).fetchone()
        return _decode(row, sqlite=False) if row else None

    def save(self, transaction: Transaction) -> tuple[Transaction, bool]:
        with self.connection() as connection:
            return self._insert(connection, transaction)

    def seed_if_empty(self, transactions: Iterable[Transaction]) -> bool:
        with self.connection() as connection:
            connection.execute("SELECT pg_advisory_xact_lock(82491632)")
            if connection.execute("SELECT 1 FROM persistence_metadata WHERE key = %s", (SEED_KEY,)).fetchone():
                return False
            empty = not connection.execute("SELECT 1 FROM transactions LIMIT 1").fetchone()
            if empty:
                for transaction in transactions:
                    self._insert(connection, transaction)
            connection.execute("INSERT INTO persistence_metadata (key, value) VALUES (%s, 'done')", (SEED_KEY,))
            return empty

    def aggregate(self, start: datetime, end: datetime, limit: int) -> dict:
        day = (
            "(time_bucket('1 day', ts, 'UTC'::text) AT TIME ZONE 'UTC')::date"
            if self.timescale
            else "(date_trunc('day', ts AT TIME ZONE 'UTC'))::date"
        )
        bounds = (start, end)
        where = "WHERE ts >= %s AND ts <= %s"
        with self.connection() as connection:
            connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            totals = connection.execute(
                "SELECT COALESCE(SUM(missed_cents),0), COALESCE(SUM(earned_cents),0), "
                f"COALESCE(SUM(best_possible_cents),0), COUNT(*) FROM transactions {where}",
                bounds,
            ).fetchone()
            daily = connection.execute(
                f"SELECT {day}, SUM(missed_cents), SUM(earned_cents), COUNT(*) FROM transactions {where} "
                "GROUP BY 1 ORDER BY 1",
                bounds,
            ).fetchall()
            categories = connection.execute(
                f"SELECT category, SUM(missed_cents) FROM transactions {where} "
                "GROUP BY category ORDER BY SUM(missed_cents) DESC, category",
                bounds,
            ).fetchall()
            rows = connection.execute(
                f"SELECT {FIELDS} FROM transactions {where} ORDER BY ts DESC, id DESC LIMIT %s", (*bounds, limit)
            ).fetchall()
        return {
            "totals": totals,
            "daily": [(d.isoformat(), m, e, c) for d, m, e, c in daily],
            "categories": categories,
            "recent": [_decode(r, sqlite=False) for r in rows],
        }


# --------------------------------------------------------------------------- facade


class Database:
    def __init__(self, store: SQLiteStore | PostgresStore, mode: str):
        self.store = store
        self.mode = mode
        self._lock = RLock()

    @classmethod
    def open(cls, database_url: str | None, sqlite_path: str | Path, allow_sqlite_fallback: bool = False) -> "Database":
        if database_url:
            try:
                store = PostgresStore(database_url)
                store.initialize()
                return cls(store, "timescale" if store.timescale else "postgres")
            except Exception as exc:
                # Never log the driver message: it can contain connection credentials.
                if not allow_sqlite_fallback:
                    raise DatabaseUnavailable(
                        f"Tiger Data is unreachable ({type(exc).__name__}). Fix DATABASE_URL, or set "
                        "ALLOW_SQLITE_FALLBACK=true to run the demo on local SQLite."
                    ) from None
                LOGGER.warning("Tiger Data unreachable (%s); ALLOW_SQLITE_FALLBACK=true, using local SQLite", type(exc).__name__)
                store = SQLiteStore(sqlite_path)
                store.initialize()
                return cls(store, "sqlite-fallback")
        store = SQLiteStore(sqlite_path)
        store.initialize()
        return cls(store, "sqlite")

    def _run(self, operation, *args):
        with self._lock:
            try:
                return operation(*args)
            except (IdempotencyConflict, ValueError):
                raise
            except Exception as exc:
                LOGGER.error("Database operation failed: %s", type(exc).__name__)
                raise DatabaseUnavailable("The database is unavailable; nothing was saved.") from None

    def get_by_key(self, key: str) -> Transaction | None:
        return self._run(self.store.get_by_key, key)

    def list_cards(self, user_id: str):
        return self._run(self.store.list_cards, user_id)

    def get_card(self, user_id: str, card_id: str):
        return self._run(self.store.get_card, user_id, card_id)

    def create_card(self, user_id: str, card_id: str, card_type: str, last4: str):
        return self._run(self.store.create_card, user_id, card_id, card_type, last4)

    def update_card(self, user_id: str, card_id: str, card_type: str | None, last4: str | None):
        return self._run(self.store.update_card, user_id, card_id, card_type, last4)

    def delete_card(self, user_id: str, card_id: str):
        return self._run(self.store.delete_card, user_id, card_id)

    def save(self, transaction: Transaction) -> tuple[Transaction, bool]:
        """Insert once per idempotency key. Returns (stored transaction, duplicate)."""
        return self._run(self.store.save, transaction)

    def seed_if_empty(self, transactions: Iterable[Transaction]) -> bool:
        return self._run(self.store.seed_if_empty, list(transactions))

    def missed(self, *, now: datetime | None = None, days: int = 30, limit: int = 50) -> dict:
        """The MissedResponse shape from schemas.py over a trailing `days`-day window."""
        if not 1 <= days <= 365 or not 1 <= limit <= 200:
            raise ValueError("days must be 1-365 and limit 1-200")
        end = utc_time(now or datetime.now(timezone.utc))
        start = end - timedelta(days=days)
        result = self._run(self.store.aggregate, start, end, limit)
        missed, earned, best, count = (int(v) for v in result["totals"])
        by_day = {d: (int(m), int(e), int(c)) for d, m, e, c in result["daily"]}
        daily = []
        day = start.date()
        while day <= end.date():
            m, e, c = by_day.get(day.isoformat(), (0, 0, 0))
            daily.append({"date": day.isoformat(), "missed_cents": m, "earned_cents": e, "count": c})
            day += timedelta(days=1)
        return {
            "window_days": days,
            "window_label": f"Last {days} days",
            "total_missed_cents": missed,
            "total_earned_cents": earned,
            "total_best_possible_cents": best,
            "transaction_count": count,
            "daily": daily,
            "by_category": [
                {"category": cat, "category_label": CATEGORY_LABELS.get(cat, cat.replace("_", " ").title()), "missed_cents": int(m)}
                for cat, m in result["categories"]
            ],
            "recent": [t.public() for t in result["recent"]],
            "db_mode": self.mode,
        }


# --------------------------------------------------------------------------- module interface

_database: Database | None = None
_init_lock = RLock()


def init() -> Database:
    """Open the configured database once and seed demo history (idempotent)."""
    global _database
    with _init_lock:
        if _database is None:
            database = Database.open(settings.database_url, settings.sqlite_path, settings.allow_sqlite_fallback)
            if settings.seed_demo_data:
                from seed import seed_demo_history

                if seed_demo_history(database):
                    LOGGER.info("Seeded demo purchase history")
            _database = database
        return _database


def use(database: Database | None) -> None:
    """Swap the active database (tests only)."""
    global _database
    _database = database


def mode() -> str:
    return _database.mode if _database else "not_initialized"


def get_db() -> Database:
    return _database or init()
