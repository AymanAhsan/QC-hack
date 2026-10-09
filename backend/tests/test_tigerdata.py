"""Opt-in real TimescaleDB integration. Never point TEST_DATABASE_URL at a database you care about."""

import os
from uuid import uuid4

import pytest

import db
from tests.conftest import NOW


def test_real_hypertable_matches_sqlite(tmp_path, monkeypatch, make_transaction):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable TimescaleDB database")
    import psycopg
    from psycopg import sql

    original_connect = psycopg.connect
    schema = f"cardmax_test_{uuid4().hex}"
    with original_connect(url) as connection:
        connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))

    def scoped_connect(*args, **kwargs):
        kwargs["options"] = f"-c search_path={schema},public -c timezone=America/New_York -c statement_timeout=5000"
        return original_connect(*args, **kwargs)

    monkeypatch.setattr(psycopg, "connect", scoped_connect)
    try:
        remote = db.Database.open(url, tmp_path / "unused.sqlite3")
        assert remote.mode == "timescale"
        local = db.Database.open(None, tmp_path / "sqlite.sqlite3")
        rows = [make_transaction(), make_transaction("nike", 10000, "apple-card", coupon="SAVE15")]
        for t in rows:
            assert remote.save(t)[1] is False
            assert remote.save(t)[1] is True  # registry deduplicates retries
            local.save(t)
        remote_summary, local_summary = remote.missed(now=NOW), local.missed(now=NOW)
        assert remote_summary.pop("db_mode") == "timescale" and local_summary.pop("db_mode") == "sqlite"
        assert remote_summary == local_summary
        restarted = db.Database.open(url, tmp_path / "unused.sqlite3")
        assert restarted.missed(now=NOW)["transaction_count"] == 2
    finally:
        with original_connect(url) as connection:
            connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
