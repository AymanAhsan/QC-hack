"""Opt-in real TimescaleDB integration; never use a production database URL."""

import os
from uuid import uuid4

import pytest

from backend.db import Database
from .conftest import NOW


def test_real_hypertable_and_sqlite_parity(tmp_path, monkeypatch, make_transaction):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable TimescaleDB database")
    import psycopg
    from psycopg import sql

    original_connect = psycopg.connect
    schema = f"ayman_test_{uuid4().hex}"
    with original_connect(url) as connection:
        assert connection.execute(
            "SELECT 1 FROM pg_extension WHERE extname='timescaledb'"
        ).fetchone(), "TimescaleDB extension must already be installed"
        connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))

    def test_connect(*args, **kwargs):
        kwargs["options"] = (
            f"-c search_path={schema},public -c timezone=America/New_York -c statement_timeout=5000"
        )
        return original_connect(*args, **kwargs)

    monkeypatch.setattr(psycopg, "connect", test_connect)
    try:
        remote = Database(tmp_path / "mirror.sqlite3", url)
        assert remote.storage == "tigerdata", (
            "Configured Tiger Data path must not silently fall back during this test"
        )
        local = Database(tmp_path / "sqlite.sqlite3")
        rows = [make_transaction(), make_transaction(merchant="nike", amount="100", card="apple")]
        for transaction in rows:
            remote.save(transaction)
            remote.save(transaction)  # Registry deduplicates remote retries.
            local.save(transaction)
        assert remote.missed(now=NOW) == local.missed(now=NOW)
        assert remote.history() == local.history()
        with test_connect(url) as connection:
            assert connection.execute(
                "SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_schema=%s AND hypertable_name='transactions'",
                (schema,),
            ).fetchone()
        # A second app startup re-applies the migration without erasing history.
        restarted = Database(tmp_path / "mirror.sqlite3", url)
        assert restarted.storage == "tigerdata"
        assert restarted.missed(now=NOW) == local.missed(now=NOW)
    finally:
        with original_connect(url) as connection:
            connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
