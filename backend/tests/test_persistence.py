from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

from backend import db as db_module
from backend.db import Database, SQLiteStore
from backend.persistence_models import IdempotencyConflict, PurchaseInput, money
from backend.seed import build_seed_history, seed_demo_history
from backend.transaction_service import evaluate_transaction
from .conftest import NOW


def test_rounds_half_up_and_rejects_invalid_money():
    assert money("2.555") == Decimal("2.56")
    for value in ("NaN", "Infinity", "-0.01", "100000000"):
        with pytest.raises(ValueError):
            money(value)


def test_survives_restart_and_keeps_cents(tmp_path, make_transaction):
    path = tmp_path / "persist.sqlite3"
    transaction = make_transaction()
    Database(path).save(transaction)
    reloaded = Database(path)
    assert reloaded.get(transaction.id) == transaction
    assert reloaded.missed(now=NOW)["total_missed"] == 3.06


def test_trailing_window_bounds_and_future_exclusion(database, make_transaction):
    start = NOW - timedelta(days=30)
    for ts in (start - timedelta(microseconds=1), start, NOW, NOW + timedelta(microseconds=1)):
        database.save(make_transaction(ts=ts))
    summary = database.missed(now=NOW)
    assert summary["transaction_count"] == 2
    assert summary["total_missed"] == 6.12
    assert len(summary["daily"]) == 31  # Partial first and last UTC days.
    assert summary["daily"][0]["date"] == "2026-09-09"
    assert summary["daily"][-1]["date"] == "2026-10-09"
    assert sum(day["transaction_count"] for day in summary["daily"]) == 2


def test_utc_buckets_and_exact_aggregate(database, make_transaction):
    local_time = NOW.replace(hour=1, tzinfo=timezone(timedelta(hours=6)))
    for _ in range(10):
        database.save(make_transaction(amount="0.14", ts=local_time))
    summary = database.missed(now=NOW)
    assert summary["total_missed"] == 0.1
    assert next(day for day in summary["daily"] if day["date"] == "2026-10-08")["missed"] == 0.1
    assert summary["daily"][-1]["missed"] == 0


def test_totals_are_not_limited_by_history_limit(database, make_transaction):
    for index in range(4):
        database.save(make_transaction(ts=NOW - timedelta(hours=index)))
    summary = database.missed(now=NOW, limit=1)
    assert len(summary["transactions"]) == 1
    assert summary["transaction_count"] == 4
    assert summary["total_missed"] == 12.24
    assert summary["by_category"] == [
        {"category": "grocery", "missed": 12.24, "transaction_count": 4}
    ]


def test_empty_summary_and_history(database):
    result = database.missed(now=NOW)
    assert result["total_missed"] == 0
    assert result["transaction_count"] == 0
    assert result["transactions"] == result["by_category"] == []
    assert all(day["missed"] == 0 for day in result["daily"])
    assert database.history() == []


def test_retries_and_conflicting_purchase_id(database, make_transaction):
    first = make_transaction(transaction_id=str(uuid4()))
    database.save(first)
    retry = make_transaction(transaction_id=first.id, ts=NOW + timedelta(minutes=1))
    assert database.save(retry) == first
    assert len(database.history()) == 1
    with pytest.raises(IdempotencyConflict):
        database.save(make_transaction(amount="100", transaction_id=first.id))


def test_concurrent_retries_only_insert_once(tmp_path, make_transaction):
    path = tmp_path / "concurrent.sqlite3"
    stores = [Database(path) for _ in range(4)]
    transaction = make_transaction()
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda index: stores[index % 4].save(transaction), range(12)))
    assert all(result == transaction for result in results)
    assert len(stores[0].history()) == 1


def test_history_order_and_pagination(database, make_transaction):
    transactions = [make_transaction(ts=NOW - timedelta(hours=index)) for index in range(3)]
    for transaction in transactions:
        database.save(transaction)
    assert database.history(limit=1, offset=1) == [transactions[1]]


def test_zero_missed_for_best_card_and_post_coupon_basis(database, evaluate):
    transaction = evaluate_transaction(
        PurchaseInput("nike", Decimal(100), "apple", "online", "SAVE15"),
        evaluate,
        ts=NOW,
    )
    database.save(transaction)
    assert transaction.amount == Decimal(85)
    assert transaction.earned == transaction.best_possible == Decimal("2.55")
    assert transaction.missed == 0
    assert database.missed(now=NOW)["total_earned"] == 2.55


def test_rejected_network_has_no_earned_value(database, evaluate):
    transaction = evaluate_transaction(
        PurchaseInput("costco", Decimal(100), "amex_gold"), evaluate, ts=NOW
    )
    database.save(transaction)
    assert transaction.earned == 0
    assert transaction.missed == Decimal(5)


def test_seed_engine_consistency_once_and_restart(tmp_path, evaluate):
    path = tmp_path / "seed.sqlite3"
    purchases = [
        PurchaseInput("trader_joes", Decimal("42.50"), "debit"),
        PurchaseInput("costco", Decimal(100), "debit"),
        PurchaseInput("nike", Decimal(100), "debit"),
        PurchaseInput("trader_joes", Decimal("42.50"), "amex_gold"),
    ]
    store = Database(path)
    assert seed_demo_history(store, evaluate, purchases, now=NOW)
    expected = build_seed_history(evaluate, purchases, now=NOW)
    assert len(store.history()) == 30
    assert store.missed(now=NOW)["total_missed"] == float(sum(row.missed for row in expected))
    assert not seed_demo_history(Database(path), evaluate, purchases, now=NOW + timedelta(days=1))
    assert len(Database(path).history()) == 30


def test_seed_does_not_mix_into_existing_history(database, evaluate, make_transaction):
    transaction = make_transaction()
    database.save(transaction)
    assert not seed_demo_history(
        database, evaluate, [PurchaseInput("nike", Decimal(100), "debit")], now=NOW
    )
    assert database.history() == [transaction]


def test_seed_validation_is_atomic(database, evaluate):
    purchases = [
        PurchaseInput("nike", Decimal(100), "debit"),
        PurchaseInput("unknown", Decimal(100), "debit"),
    ]
    with pytest.raises(KeyError):
        seed_demo_history(database, evaluate, purchases, now=NOW)
    assert database.history() == []


def test_sql_parameters_do_not_execute_merchant_text(database, make_transaction):
    from dataclasses import replace

    transaction = replace(make_transaction(), merchant="Nike'); DROP TABLE transactions; --")
    database.save(transaction)
    assert database.history()[0].merchant == transaction.merchant


def test_startup_failure_falls_back_without_logging_credentials(tmp_path, monkeypatch, caplog):
    def unavailable(url):
        raise RuntimeError(url)

    monkeypatch.setattr(db_module, "PostgresStore", unavailable)
    database = Database(
        tmp_path / "fallback.sqlite3", "postgresql://user:super-secret@example/demo"
    )
    assert database.storage == "sqlite"
    assert "super-secret" not in caplog.text
    assert "SQLite" in caplog.text


class FakeRemote(SQLiteStore):
    """Storage-level remote fault injection; real SQL has a separate opt-in test."""

    fail = False

    def save(self, transaction):
        if self.fail:
            raise ConnectionError("Venue Wi-Fi disconnected")
        return super().save(transaction)


def test_mid_session_outage_and_restart_reconciliation(tmp_path, monkeypatch, make_transaction):
    remote = FakeRemote(tmp_path / "remote.sqlite3")
    remote.initialize()
    monkeypatch.setattr(db_module, "PostgresStore", lambda url: remote)
    path = tmp_path / "local.sqlite3"
    database = Database(path, "postgresql://test")
    first = make_transaction()
    database.save(first)
    remote.fail = True
    second = make_transaction(ts=NOW - timedelta(hours=1))
    database.save(second)
    assert database.storage == "sqlite"
    assert database.missed(now=NOW)["total_missed"] == 6.12
    remote.fail = False
    recovered = Database(path, "postgresql://test")
    assert recovered.storage == "tigerdata"
    assert len(remote.all()) == 2
    assert recovered.missed(now=NOW)["total_missed"] == 6.12


def test_remote_history_is_available_after_read_failure(tmp_path, monkeypatch, make_transaction):
    remote = FakeRemote(tmp_path / "remote.sqlite3")
    remote.initialize()
    remote.save(make_transaction())
    monkeypatch.setattr(db_module, "PostgresStore", lambda url: remote)
    database = Database(tmp_path / "local.sqlite3", "postgresql://test")
    monkeypatch.setattr(remote, "aggregate", lambda *args: (_ for _ in ()).throw(ConnectionError()))
    assert database.missed(now=NOW)["total_missed"] == 3.06
    assert database.storage == "sqlite"


def test_ambiguous_remote_commit_does_not_duplicate_on_restart(
    tmp_path, monkeypatch, make_transaction
):
    remote = FakeRemote(tmp_path / "remote.sqlite3")
    remote.initialize()
    monkeypatch.setattr(db_module, "PostgresStore", lambda url: remote)
    path = tmp_path / "local.sqlite3"
    database = Database(path, "postgresql://test")
    original_save = remote.save

    def save_then_disconnect(transaction):
        original_save(transaction)
        raise ConnectionError("Commit succeeded but acknowledgement was lost")

    monkeypatch.setattr(remote, "save", save_then_disconnect)
    transaction = make_transaction()
    assert database.save(transaction) == transaction
    assert database.storage == "sqlite"
    monkeypatch.setattr(remote, "save", original_save)
    restarted = Database(path, "postgresql://test")
    assert restarted.save(transaction) == transaction
    assert len(remote.all()) == len(restarted.history()) == 1
    assert restarted.missed(now=NOW)["total_missed"] == 3.06


def test_remote_timestamp_is_canonical_after_reconciliation(
    tmp_path, monkeypatch, make_transaction
):
    remote = FakeRemote(tmp_path / "remote.sqlite3")
    remote.initialize()
    transaction = make_transaction()
    remote.save(transaction)
    path = tmp_path / "local.sqlite3"
    Database(path).save(make_transaction(transaction_id=transaction.id, ts=NOW - timedelta(days=1)))
    monkeypatch.setattr(db_module, "PostgresStore", lambda url: remote)
    restarted = Database(path, "postgresql://test")
    assert restarted.local.get(transaction.id) == transaction
    assert restarted.missed(now=NOW)["daily"][-1]["missed"] == 3.06


def test_conflicting_remote_race_removes_rejected_local_candidate(
    tmp_path, monkeypatch, make_transaction
):
    remote = FakeRemote(tmp_path / "remote.sqlite3")
    remote.initialize()
    monkeypatch.setattr(db_module, "PostgresStore", lambda url: remote)
    database = Database(tmp_path / "local.sqlite3", "postgresql://test")
    transaction = make_transaction()
    original_save = remote.save

    def another_worker_wins(candidate):
        original_save(make_transaction(amount="100", transaction_id=candidate.id))
        return original_save(candidate)

    monkeypatch.setattr(remote, "save", another_worker_wins)
    with pytest.raises(IdempotencyConflict):
        database.save(transaction)
    assert database.local.get(transaction.id) is None


@pytest.mark.parametrize("limit", [0, 101])
def test_limits_are_validated(database, limit):
    with pytest.raises(ValueError):
        database.missed(now=NOW, limit=limit)
    with pytest.raises(ValueError):
        database.history(limit=limit)
