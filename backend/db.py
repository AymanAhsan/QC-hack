"""Tiger Data storage with a durable SQLite fallback for the simulated demo.

SQLite is also a local journal. Writes reach it before PostgreSQL, so a network
failure (including an ambiguous remote commit) can be retried with the same ID.
No rewards calculations or mock merchant/card definitions live in this module.
"""

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import logging
import os
from pathlib import Path
import sqlite3
from threading import RLock
from typing import Iterable

from .persistence_models import IdempotencyConflict, Transaction, utc_time

LOGGER = logging.getLogger(__name__)
MIGRATIONS = Path(__file__).with_name("migrations")
FIELDS = "id, ts, merchant, category, amount, card_used, best_card, earned, best_possible, missed, channel, request_hash"
SQLITE_FIELDS = (
    FIELDS.replace("amount,", "amount_cents,")
    .replace("earned,", "earned_cents,")
    .replace("best_possible,", "best_possible_cents,")
    .replace("missed,", "missed_cents,")
)


def _timestamp(value: datetime) -> str:
    # Fixed precision and UTC are essential for SQLite lexical range queries.
    return utc_time(value).isoformat(timespec="microseconds")


def _decode(row, *, sqlite: bool = False) -> Transaction:
    values = list(row)
    values[0] = str(values[0])
    if sqlite:
        values[1] = datetime.fromisoformat(values[1])
        for index in (4, 7, 8, 9):
            values[index] = Decimal(values[index]) / 100
    return Transaction(*values)


def _values(transaction: Transaction, *, sqlite: bool = False) -> tuple:
    result = [getattr(transaction, name.strip()) for name in FIELDS.split(",")]
    if sqlite:
        result[1] = _timestamp(transaction.ts)
        for index in (4, 7, 8, 9):
            result[index] = int(result[index] * 100)
    return tuple(result)


def _check_retry(existing: Transaction, candidate: Transaction) -> Transaction:
    if existing.request_hash != candidate.request_hash:
        raise IdempotencyConflict("Request ID already belongs to another purchase")
    return existing


class SQLiteStore:
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
            connection.executescript((MIGRATIONS / "001_transactions.sqlite.sql").read_text())

    def get(self, transaction_id: str) -> Transaction | None:
        with self.connection() as connection:
            row = connection.execute(
                f"SELECT {SQLITE_FIELDS} FROM transactions WHERE id = ?", (transaction_id,)
            ).fetchone()
        return _decode(row, sqlite=True) if row else None

    def save(self, transaction: Transaction) -> Transaction:
        with self.connection() as connection:
            connection.execute(
                f"INSERT INTO transactions ({SQLITE_FIELDS}) VALUES ({','.join(['?'] * 12)}) "
                "ON CONFLICT(id) DO NOTHING",
                _values(transaction, sqlite=True),
            )
            row = connection.execute(
                f"SELECT {SQLITE_FIELDS} FROM transactions WHERE id = ?", (transaction.id,)
            ).fetchone()
            return _check_retry(_decode(row, sqlite=True), transaction)

    def mirror(self, transaction: Transaction) -> Transaction:
        """Replace a matching local retry with the canonical remote snapshot."""
        with self.connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                f"SELECT {SQLITE_FIELDS} FROM transactions WHERE id = ?", (transaction.id,)
            ).fetchone()
            if row:
                _check_retry(_decode(row, sqlite=True), transaction)
            assignments = ",".join(
                f"{field.strip()}=excluded.{field.strip()}"
                for field in SQLITE_FIELDS.split(",")[1:]
            )
            connection.execute(
                f"INSERT INTO transactions ({SQLITE_FIELDS}) VALUES ({','.join(['?'] * 12)}) "
                f"ON CONFLICT(id) DO UPDATE SET {assignments}",
                _values(transaction, sqlite=True),
            )
        return transaction

    def discard(self, transaction: Transaction) -> None:
        with self.connection() as connection:
            connection.execute(
                "DELETE FROM transactions WHERE id = ? AND request_hash = ?",
                (transaction.id, transaction.request_hash),
            )

    def seed_if_empty(self, transactions: Iterable[Transaction]) -> bool:
        with self.connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            if connection.execute(
                "SELECT 1 FROM persistence_metadata WHERE key = 'demo_seed_v1'"
            ).fetchone():
                return False
            empty = not connection.execute("SELECT 1 FROM transactions LIMIT 1").fetchone()
            if empty:
                connection.executemany(
                    f"INSERT INTO transactions ({SQLITE_FIELDS}) VALUES ({','.join(['?'] * 12)})",
                    [_values(transaction, sqlite=True) for transaction in transactions],
                )
            connection.execute(
                "INSERT INTO persistence_metadata (key, value) VALUES ('demo_seed_v1', 'done')"
            )
            return empty

    def all(self) -> list[Transaction]:
        with self.connection() as connection:
            rows = connection.execute(
                f"SELECT {SQLITE_FIELDS} FROM transactions ORDER BY ts, id"
            ).fetchall()
        return [_decode(row, sqlite=True) for row in rows]

    def history(self, limit: int, offset: int = 0) -> list[Transaction]:
        with self.connection() as connection:
            rows = connection.execute(
                f"SELECT {SQLITE_FIELDS} FROM transactions ORDER BY ts DESC, id DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
        return [_decode(row, sqlite=True) for row in rows]

    def aggregate(self, start: datetime, end: datetime, limit: int) -> dict:
        bounds = (_timestamp(start), _timestamp(end))
        with self.connection() as connection:
            # All queries use one snapshot, even if a Wallet payment arrives mid-read.
            connection.execute("BEGIN")
            totals = connection.execute(
                "SELECT COALESCE(SUM(missed_cents),0), COALESCE(SUM(earned_cents),0), "
                "COALESCE(SUM(best_possible_cents),0), COUNT(*) FROM transactions WHERE ts >= ? AND ts <= ?",
                bounds,
            ).fetchone()
            daily = connection.execute(
                "SELECT substr(ts,1,10), SUM(missed_cents), COUNT(*) FROM transactions "
                "WHERE ts >= ? AND ts <= ? GROUP BY substr(ts,1,10) ORDER BY 1",
                bounds,
            ).fetchall()
            categories = connection.execute(
                "SELECT category, SUM(missed_cents), COUNT(*) FROM transactions "
                "WHERE ts >= ? AND ts <= ? GROUP BY category ORDER BY SUM(missed_cents) DESC, category",
                bounds,
            ).fetchall()
            rows = connection.execute(
                f"SELECT {SQLITE_FIELDS} FROM transactions WHERE ts >= ? AND ts <= ? "
                "ORDER BY ts DESC, id DESC LIMIT ?",
                (*bounds, limit),
            ).fetchall()
        return _aggregate_result(totals, daily, categories, rows, sqlite=True)


class PostgresStore:
    def __init__(self, database_url: str):
        # Import only when configured; SQLite works without psycopg installed.
        import psycopg

        self.connect = psycopg.connect
        self.database_url = database_url

    @contextmanager
    def connection(self):
        with self.connect(
            self.database_url, connect_timeout=3, options="-c statement_timeout=5000"
        ) as connection:
            yield connection

    def initialize(self) -> None:
        with self.connection() as connection:
            # Serializes schema initialization across multiple application workers.
            connection.execute("SELECT pg_advisory_xact_lock(82491631)")
            connection.execute((MIGRATIONS / "001_transactions.postgres.sql").read_text())

    def get(self, transaction_id: str) -> Transaction | None:
        with self.connection() as connection:
            row = connection.execute(
                f"SELECT {FIELDS} FROM transactions WHERE id = %s", (transaction_id,)
            ).fetchone()
        return _decode(row) if row else None

    def save(self, transaction: Transaction) -> Transaction:
        with self.connection() as connection:
            connection.execute(
                "INSERT INTO transaction_requests (id, ts, request_hash) VALUES (%s,%s,%s) "
                "ON CONFLICT(id) DO NOTHING",
                (transaction.id, transaction.ts, transaction.request_hash),
            )
            registry = connection.execute(
                "SELECT ts, request_hash FROM transaction_requests WHERE id = %s FOR UPDATE",
                (transaction.id,),
            ).fetchone()
            if registry[1] != transaction.request_hash:
                raise IdempotencyConflict("Request ID already belongs to another purchase")
            values = list(_values(transaction))
            values[1] = registry[0]
            connection.execute(
                f"INSERT INTO transactions ({FIELDS}) VALUES ({','.join(['%s'] * 12)}) "
                "ON CONFLICT(id, ts) DO NOTHING",
                values,
            )
            row = connection.execute(
                f"SELECT {FIELDS} FROM transactions WHERE id = %s AND ts = %s",
                (transaction.id, registry[0]),
            ).fetchone()
        return _decode(row)

    def all(self) -> list[Transaction]:
        with self.connection() as connection:
            rows = connection.execute(
                f"SELECT {FIELDS} FROM transactions ORDER BY ts, id"
            ).fetchall()
        return [_decode(row) for row in rows]

    def history(self, limit: int, offset: int = 0) -> list[Transaction]:
        with self.connection() as connection:
            rows = connection.execute(
                f"SELECT {FIELDS} FROM transactions ORDER BY ts DESC, id DESC LIMIT %s OFFSET %s",
                (limit, offset),
            ).fetchall()
        return [_decode(row) for row in rows]

    def aggregate(self, start: datetime, end: datetime, limit: int) -> dict:
        with self.connection() as connection:
            connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            totals = connection.execute(
                "SELECT COALESCE(SUM(missed),0), COALESCE(SUM(earned),0), "
                "COALESCE(SUM(best_possible),0), COUNT(*) FROM transactions WHERE ts >= %s AND ts <= %s",
                (start, end),
            ).fetchone()
            daily = connection.execute(
                "SELECT (time_bucket('1 day', ts, 'UTC'::text) AT TIME ZONE 'UTC')::date, SUM(missed), COUNT(*) "
                "FROM transactions WHERE ts >= %s AND ts <= %s GROUP BY 1 ORDER BY 1",
                (start, end),
            ).fetchall()
            categories = connection.execute(
                "SELECT category, SUM(missed), COUNT(*) FROM transactions WHERE ts >= %s AND ts <= %s "
                "GROUP BY category ORDER BY SUM(missed) DESC, category",
                (start, end),
            ).fetchall()
            rows = connection.execute(
                f"SELECT {FIELDS} FROM transactions WHERE ts >= %s AND ts <= %s "
                "ORDER BY ts DESC, id DESC LIMIT %s",
                (start, end, limit),
            ).fetchall()
        return _aggregate_result(totals, daily, categories, rows)


def _aggregate_result(totals, daily, categories, rows, *, sqlite: bool = False) -> dict:
    scale = Decimal(100) if sqlite else Decimal(1)
    return {
        "total_missed": float(Decimal(totals[0]) / scale),
        "total_earned": float(Decimal(totals[1]) / scale),
        "best_possible": float(Decimal(totals[2]) / scale),
        "transaction_count": totals[3],
        "daily": [
            {"date": str(day), "missed": float(Decimal(value) / scale), "transaction_count": count}
            for day, value, count in daily
        ],
        "by_category": [
            {
                "category": category,
                "missed": float(Decimal(value) / scale),
                "transaction_count": count,
            }
            for category, value, count in categories
        ],
        "transactions": [_decode(row, sqlite=sqlite).public() for row in rows],
    }


class Database:
    """One instance per app; the SQLite file is private to this simulated wallet.

    Remote failure selects SQLite for the rest of this app's lifetime. On restart,
    both stores reconcile by request ID before remote queries are enabled again.
    """

    def __init__(self, sqlite_path: str | Path, database_url: str | None = None):
        self.local = SQLiteStore(sqlite_path)
        self.remote: PostgresStore | None = None
        self._lock = RLock()
        self.local.initialize()
        if database_url:
            try:
                self.remote = PostgresStore(database_url)
                self.remote.initialize()
                self._sync()
            except IdempotencyConflict:
                raise
            except Exception:
                self._fallback()

    @classmethod
    def from_env(cls) -> "Database":
        return cls(
            os.getenv("SQLITE_PATH", "backend/credit_optimizer.sqlite3"),
            os.getenv("DATABASE_URL") or None,
        )

    @property
    def storage(self) -> str:
        return "tigerdata" if self.remote else "sqlite"

    def _fallback(self) -> None:
        # Do not log driver exception text: it may contain connection credentials.
        LOGGER.warning("Tiger Data unavailable; using the durable SQLite history for this session")
        self.remote = None

    def _sync(self) -> None:
        if self.remote:
            remote_rows = self.remote.all()
            remote_ids = {transaction.id for transaction in remote_rows}
            for transaction in remote_rows:
                self.local.mirror(transaction)
            for transaction in self.local.all():
                if transaction.id not in remote_ids:
                    self.local.mirror(self.remote.save(transaction))

    def get(self, transaction_id: str) -> Transaction | None:
        with self._lock:
            if self.remote:
                try:
                    remote = self.remote.get(transaction_id)
                    if remote:
                        return self.local.mirror(remote)
                except IdempotencyConflict:
                    raise
                except Exception:
                    self._fallback()
            return self.local.get(transaction_id)

    def save(self, transaction: Transaction) -> Transaction:
        with self._lock:
            # get() catches IDs created by other remote workers before local writes.
            existing = self.get(transaction.id)
            if existing:
                return _check_retry(existing, transaction)
            saved = self.local.save(transaction)
            if self.remote:
                try:
                    saved = self.local.mirror(self.remote.save(saved))
                except IdempotencyConflict:
                    # A different worker may win the remote registry race. Do
                    # not leave the rejected candidate in fallback history.
                    self.local.discard(saved)
                    raise
                except Exception:
                    self._fallback()
            return saved

    def seed_if_empty(self, transactions: Iterable[Transaction]) -> bool:
        with self._lock:
            seeded = self.local.seed_if_empty(transactions)
            if self.remote:
                try:
                    self._sync()
                except IdempotencyConflict:
                    raise
                except Exception:
                    self._fallback()
            return seeded

    def history(self, limit: int = 50, offset: int = 0) -> list[Transaction]:
        if not 1 <= limit <= 100 or offset < 0:
            raise ValueError("Limit must be 1–100 and offset nonnegative")
        with self._lock:
            if self.remote:
                try:
                    # Refresh local history before reads so fallback includes other workers.
                    self._sync()
                    return self.remote.history(limit, offset)
                except IdempotencyConflict:
                    raise
                except Exception:
                    self._fallback()
            return self.local.history(limit, offset)

    def missed(self, *, now: datetime | None = None, limit: int = 50) -> dict:
        if not 1 <= limit <= 100:
            raise ValueError("Limit must be 1–100")
        end = utc_time(now or datetime.now(timezone.utc))
        start = end - timedelta(days=30)
        with self._lock:
            result = None
            if self.remote:
                try:
                    self._sync()
                    result = self.remote.aggregate(start, end, limit)
                except IdempotencyConflict:
                    raise
                except Exception:
                    self._fallback()
            if result is None:
                result = self.local.aggregate(start, end, limit)
        daily = {item["date"]: item for item in result["daily"]}
        day = start.date()
        result["daily"] = []
        while day <= end.date():
            label = day.isoformat()
            result["daily"].append(
                daily.get(label, {"date": label, "missed": 0.0, "transaction_count": 0})
            )
            day += timedelta(days=1)
        result.update(
            window_days=30,
            window_start=_timestamp(start),
            window_end=_timestamp(end),
            currency="USD",
        )
        return result
