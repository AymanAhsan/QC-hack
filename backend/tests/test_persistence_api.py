import pytest
from fastapi.testclient import TestClient

import transaction_service
from main import app

client = TestClient(app)


def purchase(**overrides):
    body = {
        "idempotency_key": "api-key-0001",
        "merchant_id": "trader-joes",
        "subtotal_cents": 4250,
        "card_used_id": "everyday-debit",
        "channel": "store",
        "source": "wallet",
    }
    body.update(overrides)
    return body


def test_purchase_updates_history_total_and_chart():
    before = client.get("/api/missed").json()
    assert before["total_missed_cents"] == 0 and before["db_mode"] == "sqlite"
    r = client.post("/api/transactions", json=purchase())
    assert r.status_code == 201
    body = r.json()
    assert body["duplicate"] is False
    t = body["transaction"]
    assert (t["earned_cents"], t["best_possible_cents"], t["missed_cents"], t["best_card_id"]) == (0, 306, 306, "amex-gold")
    assert t["merchant_name"] == "Trader Joe's" and t["is_simulated"] is True
    assert "request_hash" not in t and "idempotency_key" not in t
    after = client.get("/api/missed").json()
    assert after["total_missed_cents"] == 306 and after["transaction_count"] == 1
    assert after["daily"][-1]["missed_cents"] == 306
    assert after["recent"][0]["id"] == t["id"]


def test_best_card_purchase_has_zero_missed_and_points():
    t = client.post("/api/transactions", json=purchase(card_used_id="amex-gold")).json()["transaction"]
    assert (t["earned_cents"], t["missed_cents"], t["points_earned"]) == (306, 0, 170)


def test_replay_is_stable_and_conflicting_payload_is_rejected():
    first = client.post("/api/transactions", json=purchase())
    replay = client.post("/api/transactions", json=purchase())
    assert replay.status_code == 200 and replay.json()["duplicate"] is True
    assert replay.json()["transaction"] == first.json()["transaction"]
    conflict = client.post("/api/transactions", json=purchase(subtotal_cents=5000))
    assert conflict.status_code == 409 and conflict.json()["error"]["code"] == "idempotency_conflict"
    assert client.get("/api/missed").json()["transaction_count"] == 1


def test_replay_does_not_re_evaluate(monkeypatch):
    client.post("/api/transactions", json=purchase())

    def must_not_run(*args, **kwargs):
        raise AssertionError("replay re-evaluated the purchase")

    monkeypatch.setattr(transaction_service, "build_transaction", must_not_run)
    assert client.post("/api/transactions", json=purchase()).json()["duplicate"] is True


def test_coupon_is_revalidated_and_rewards_use_discounted_amount():
    t = client.post(
        "/api/transactions", json=purchase(merchant_id="nike", subtotal_cents=10000, coupon_code="save15", channel="online")
    ).json()["transaction"]
    assert (t["coupon_code"], t["coupon_savings_cents"], t["amount_cents"], t["missed_cents"]) == ("SAVE15", 1500, 8500, 255)
    bad = client.post("/api/transactions", json=purchase(idempotency_key="api-key-0002", coupon_code="BOGUS"))
    assert bad.status_code == 404 and bad.json()["error"]["code"] == "coupon_not_found"
    ineligible = client.post(
        "/api/transactions",
        json=purchase(idempotency_key="api-key-0003", merchant_id="nike", subtotal_cents=3000, coupon_code="SAVE15"),
    )
    assert ineligible.status_code == 422 and ineligible.json()["error"]["code"] == "coupon_not_eligible"


def test_unknown_store_from_scan_is_logged():
    t = client.post(
        "/api/transactions",
        json=purchase(merchant_id=None, merchant_name="Bob's Pizza Kitchen", subtotal_cents=3000, channel="online", source="scan"),
    ).json()["transaction"]
    assert t["merchant_id"] == "unknown:bobspizzakitchen" and t["merchant_name"] == "Bob's Pizza Kitchen"


@pytest.mark.parametrize(
    "update",
    [
        {"missed_cents": 0},
        {"earned_cents": 999},
        {"subtotal_cents": 0},
        {"card_used_id": "no-such-card"},
        {"merchant_id": "no-such-store"},
        {"idempotency_key": "short"},
        {"channel": "teleport"},
    ],
)
def test_invalid_or_client_calculated_rewards_rejected(update):
    r = client.post("/api/transactions", json=purchase(**update))
    assert r.status_code in (404, 422), r.json()
    assert client.get("/api/missed").json()["transaction_count"] == 0


@pytest.mark.parametrize("url", ["/api/missed?limit=0", "/api/missed?limit=201", "/api/missed?days=0", "/api/missed?days=400"])
def test_invalid_missed_query(url):
    assert client.get(url).status_code == 422


def test_database_outage_returns_503_and_reports_nothing_saved(database, monkeypatch):
    def broken(*args):
        raise OSError("disk unavailable")

    monkeypatch.setattr(database.store, "save", broken)
    r = client.post("/api/transactions", json=purchase())
    assert r.status_code == 503 and r.json()["error"]["code"] == "database_unavailable"


def test_health_reports_db_mode():
    assert client.get("/api/health").json()["db_mode"] == "sqlite"
