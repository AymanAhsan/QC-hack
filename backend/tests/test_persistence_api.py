from decimal import Decimal
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from backend.routers.missed import create_missed_router
from backend.routers.transactions import create_transactions_router
from .conftest import NOW


@pytest.fixture
def client(database, evaluate):
    app = FastAPI()
    app.include_router(create_transactions_router(database, evaluate, clock=lambda: NOW))
    app.include_router(create_missed_router(database, clock=lambda: NOW))
    with TestClient(app) as client:
        yield client


def test_purchase_updates_history_total_and_chart(client):
    result = client.post(
        "/api/transactions", json={"merchant": "trader_joes", "amount": 42.50, "card_used": "debit"}
    )
    assert result.status_code == 201
    transaction = result.json()
    assert transaction["missed"] == 3.06
    assert "request_hash" not in transaction
    summary = client.get("/api/missed").json()
    assert summary["total_missed"] == 3.06
    assert summary["daily"][-1]["missed"] == 3.06
    assert summary["transactions"] == client.get("/api/transactions").json() == [transaction]


def test_replay_is_stable_and_conflicting_payload_is_rejected(client):
    payload = {"merchant": "nike", "amount": 100, "card_used": "debit", "request_id": str(uuid4())}
    first = client.post("/api/transactions", json=payload)
    replay = client.post("/api/transactions", json=payload)
    assert replay.status_code == 200
    assert replay.json() == first.json()
    assert client.post("/api/transactions", json={**payload, "amount": 101}).status_code == 409
    assert client.get("/api/missed").json()["transaction_count"] == 1


def test_replay_does_not_re_evaluate_changed_engine(database):
    calls = []
    from backend.persistence_models import PurchaseEvaluation

    def evaluate(purchase):
        calls.append(purchase)
        if len(calls) > 1:
            raise RuntimeError("The engine must not be called on a stored retry")
        return PurchaseEvaluation(
            "Nike", "retail", "Debit", "Apple Card", purchase.amount, Decimal(0), Decimal(3)
        )

    app = FastAPI()
    app.include_router(create_transactions_router(database, evaluate))
    client = TestClient(app)
    payload = {"merchant": "nike", "amount": 100, "card_used": "debit", "request_id": str(uuid4())}
    first = client.post("/api/transactions", json=payload)
    replay = client.post("/api/transactions", json=payload)
    assert replay.json() == first.json()
    assert len(calls) == 1


def test_coupon_is_forwarded_and_rewards_use_discounted_amount(client):
    result = client.post(
        "/api/transactions",
        json={
            "merchant": "nike",
            "amount": 100,
            "card_used": "debit",
            "channel": "online",
            "coupon_code": "SAVE15",
        },
    )
    assert result.status_code == 201
    assert result.json()["amount"] == 85
    assert result.json()["best_possible"] == result.json()["missed"] == 2.55


@pytest.mark.parametrize(
    "update",
    [
        {"amount": -1},
        {"amount": 0},
        {"amount": "NaN"},
        {"amount": "Infinity"},
        {"amount": 0.001},
        {"amount": 100000000},
        {"merchant": " "},
        {"card_used": " "},
        {"merchant": "unknown"},
        {"card_used": "missing"},
        {"channel": "terminal"},
        {"request_id": "not-a-uuid"},
        {"coupon_code": " "},
        {"coupon_code": "FAKE"},
        {"earned": 100, "missed": 0},
    ],
)
def test_invalid_or_client_calculated_rewards_rejected(client, update):
    payload = {"merchant": "nike", "amount": 100, "card_used": "debit", **update}
    assert client.post("/api/transactions", json=payload).status_code == 422
    assert client.get("/api/transactions").json() == []


@pytest.mark.parametrize(
    "url", ["/api/missed?limit=0", "/api/missed?limit=101", "/api/transactions?offset=-1"]
)
def test_invalid_history_query(client, url):
    assert client.get(url).status_code == 422


def test_unknown_merchant_can_be_supported_by_shared_evaluator(database):
    from backend.persistence_models import PurchaseEvaluation

    app = FastAPI()

    def evaluate(purchase):
        return PurchaseEvaluation(
            purchase.merchant,
            "retail",
            purchase.card_used,
            "Venture X",
            purchase.amount,
            Decimal(0),
            Decimal("2.80"),
        )

    app.include_router(create_transactions_router(database, evaluate))
    with TestClient(app) as client:
        result = client.post(
            "/api/transactions",
            json={
                "merchant": "AI demo store",
                "amount": 100,
                "card_used": "Everyday Debit",
                "channel": "online",
            },
        )
        assert result.status_code == 201
        assert result.json()["missed"] == 2.8
