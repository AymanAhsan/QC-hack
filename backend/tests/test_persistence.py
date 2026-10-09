import logging
import threading
from datetime import timedelta

import pytest

import db
from persistence_models import DatabaseUnavailable, IdempotencyConflict
from seed import SEED_PURCHASES, build_seed_history, seed_demo_history
from tests.conftest import NOW


def test_debit_purchase_records_engine_values(make_transaction):
    t = make_transaction()
    assert (t.earned_cents, t.best_possible_cents, t.missed_cents) == (0, 306, 306)
    assert t.best_card_id == "amex-gold" and t.points_earned is None


def test_coupon_purchase_uses_post_coupon_charge(make_transaction):
    t = make_transaction("nike", 10000, "everyday-debit", coupon="SAVE15")
    assert (t.coupon_code, t.coupon_savings_cents, t.amount_cents) == ("SAVE15", 1500, 8500)
    assert t.best_possible_cents == 255 and t.missed_cents == 255


def test_survives_restart_and_keeps_cents(tmp_path, make_transaction):
    path = tmp_path / "restart.sqlite3"
    first = db.Database.open(None, path)
    saved, duplicate = first.save(make_transaction(subtotal_cents=4251))
    assert not duplicate
    restarted = db.Database.open(None, path)
    assert restarted.get_by_key(saved.idempotency_key) == saved
    assert restarted.missed(now=NOW)["total_missed_cents"] == saved.missed_cents


def test_trailing_window_bounds_and_future_exclusion(database, make_transaction):
    database.save(make_transaction(ts=NOW - timedelta(days=30)))  # exactly on the boundary: included
    database.save(make_transaction(ts=NOW - timedelta(days=30, seconds=1)))  # just outside
    database.save(make_transaction(ts=NOW + timedelta(seconds=1)))  # future
    summary = database.missed(now=NOW)
    assert summary["transaction_count"] == 1
    assert summary["window_label"] == "Last 30 days"
    assert summary["daily"][0]["date"] == "2026-09-09" and summary["daily"][-1]["date"] == "2026-10-09"
    assert sum(d["count"] for d in summary["daily"]) == 1


def test_utc_buckets_and_exact_aggregate(database, make_transaction):
    database.save(make_transaction(ts=NOW.replace(hour=0, minute=0)))
    database.save(make_transaction("nike", 10000, ts=NOW.replace(hour=23, minute=59)))
    summary = database.missed(now=NOW.replace(hour=23, minute=59, second=30))
    today = summary["daily"][-1]
    assert today == {"date": "2026-10-09", "missed_cents": 306 + 300, "earned_cents": 0, "count": 2}
    assert summary["total_missed_cents"] == 606
    assert summary["total_best_possible_cents"] == 606
    assert {c["category"]: c["missed_cents"] for c in summary["by_category"]} == {"grocery": 306, "apparel": 300}
    assert summary["by_category"][0]["category_label"] == "Grocery"


def test_totals_are_not_limited_by_history_limit(database, make_transaction):
    for i in range(5):
        database.save(make_transaction(ts=NOW - timedelta(hours=i)))
    summary = database.missed(now=NOW, limit=2)
    assert summary["transaction_count"] == 5 and len(summary["recent"]) == 2
    assert summary["total_missed_cents"] == 5 * 306
    assert summary["recent"][0]["ts"] == "2026-10-09T16:00:00Z"  # newest first


def test_empty_summary(database):
    summary = database.missed(now=NOW)
    assert summary["total_missed_cents"] == 0 and summary["recent"] == []
    assert len(summary["daily"]) == 31 and all(d["count"] == 0 for d in summary["daily"])
    assert summary["db_mode"] == "sqlite"


def test_retries_and_conflicting_key(database, make_transaction):
    first = make_transaction(key="retry-key-1")
    saved, duplicate = database.save(first)
    assert not duplicate
    again, duplicate = database.save(make_transaction(key="retry-key-1"))  # same purchase, new uuid
    assert duplicate and again == saved
    with pytest.raises(IdempotencyConflict):
        database.save(make_transaction("costco", 10000, key="retry-key-1"))
    assert database.missed(now=NOW)["transaction_count"] == 1


def test_concurrent_retries_only_insert_once(tmp_path, make_transaction):
    path = tmp_path / "concurrent.sqlite3"
    db.Database.open(None, path)
    attempts = [make_transaction(key="concurrent-key") for _ in range(8)]
    results = []

    def worker(t):
        results.append(db.Database.open(None, path).save(t))

    threads = [threading.Thread(target=worker, args=(t,)) for t in attempts]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sum(1 for _, duplicate in results if not duplicate) == 1
    assert len({saved.id for saved, _ in results}) == 1
    assert db.Database.open(None, path).missed(now=NOW)["transaction_count"] == 1


def test_sql_parameters_do_not_execute_key_text(database, make_transaction):
    database.save(make_transaction(key="x'); DROP TABLE transactions; --"))
    assert database.missed(now=NOW)["transaction_count"] == 1


def test_limits_are_validated(database):
    for kwargs in ({"limit": 0}, {"limit": 201}, {"days": 0}, {"days": 366}):
        with pytest.raises(ValueError):
            database.missed(now=NOW, **kwargs)


def test_seed_is_engine_consistent_once_and_survives_restart(tmp_path):
    path = tmp_path / "seed.sqlite3"
    database = db.Database.open(None, path)
    assert seed_demo_history(database, now=NOW) is True
    assert seed_demo_history(database, now=NOW) is False
    restarted = db.Database.open(None, path)
    assert seed_demo_history(restarted, now=NOW) is False
    summary = restarted.missed(now=NOW, limit=200)
    history = build_seed_history(now=NOW)
    assert summary["transaction_count"] == len(SEED_PURCHASES) == 30
    assert summary["total_missed_cents"] == sum(t.missed_cents for t in history) > 0
    debit = sum(1 for t in history if t.card_used_id == "everyday-debit")
    assert debit > len(history) / 2  # mostly the wrong card, so the counter has a story
    assert any(t.missed_cents == 0 for t in history)  # and some correct choices


def test_seed_does_not_mix_into_existing_history(database, make_transaction):
    database.save(make_transaction())
    assert seed_demo_history(database, now=NOW) is False
    assert database.missed(now=NOW)["transaction_count"] == 1


def test_sqlite_upgrades_pre_contract_table(tmp_path, make_transaction):
    import sqlite3

    path = tmp_path / "legacy.sqlite3"
    with sqlite3.connect(path) as connection:
        connection.execute("CREATE TABLE transactions (id TEXT PRIMARY KEY, merchant TEXT)")
        connection.execute("CREATE INDEX transactions_ts_idx ON transactions (id)")
    database = db.Database.open(None, path)
    database.save(make_transaction())
    assert database.missed(now=NOW)["transaction_count"] == 1
    with sqlite3.connect(path) as connection:
        assert connection.execute("SELECT name FROM sqlite_master WHERE name='transactions_v1_legacy'").fetchone()


# ----------------------------------------------------------------------------- no silent fallback


def _unreachable(monkeypatch, secret="postgresql://demo:SECRET@unreachable/db"):
    import psycopg

    def fail(*args, **kwargs):
        raise psycopg.OperationalError(f"connection failed for {secret}")

    monkeypatch.setattr(psycopg, "connect", fail)
    return secret


def test_unreachable_tiger_data_fails_startup_without_explicit_fallback(tmp_path, monkeypatch, caplog):
    url = _unreachable(monkeypatch)
    with caplog.at_level(logging.DEBUG):
        with pytest.raises(DatabaseUnavailable) as error:
            db.Database.open(url, tmp_path / "x.sqlite3", allow_sqlite_fallback=False)
    assert "ALLOW_SQLITE_FALLBACK" in str(error.value)
    assert "SECRET" not in str(error.value) and "SECRET" not in caplog.text


def test_explicit_fallback_is_visible(tmp_path, monkeypatch, caplog):
    url = _unreachable(monkeypatch)
    with caplog.at_level(logging.DEBUG):
        database = db.Database.open(url, tmp_path / "x.sqlite3", allow_sqlite_fallback=True)
    assert database.mode == "sqlite-fallback"
    assert database.missed(now=NOW)["db_mode"] == "sqlite-fallback"
    assert "SECRET" not in caplog.text


def test_failed_write_raises_instead_of_switching(database, make_transaction, monkeypatch):
    def broken(*args):
        raise OSError("disk unavailable")

    monkeypatch.setattr(database.store, "save", broken)
    with pytest.raises(DatabaseUnavailable):
        database.save(make_transaction())
    assert database.mode == "sqlite"
