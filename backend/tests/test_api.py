from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_wallet_and_locations():
    cards = client.get("/api/wallet").json()["cards"]
    assert [c["id"] for c in cards][0] == "amex-gold"
    locs = client.get("/api/locations").json()["locations"]
    assert len(locs) == 45
    assert {l["id"] for l in locs} >= {"trader-joes", "costco"}


def test_recommend_costco():
    body = client.get("/api/recommend", params={"merchant_id": "costco", "amount_cents": 10000}).json()
    assert body["winner_card_id"] == "chase-freedom"
    amex = next(c for c in body["ranking"] if c["card_id"] == "amex-gold")
    assert amex["accepted"] is False and amex["rank"] is None
    assert body["why"]["network"]["rejections"][0]["label"] == "Amex rejected by Costco terminal"


def test_recommend_trader_joes_default_amount():
    body = client.get("/api/recommend", params={"merchant_id": "trader-joes"}).json()
    assert body["amount_cents"] == 4250
    winner = body["ranking"][0]
    assert winner["card_id"] == "amex-gold" and winner["points"] == 170 and winner["value_cents"] == 306
    assert winner["yield_pct"] == 7.2


def test_recommend_errors():
    r = client.get("/api/recommend", params={"merchant_id": "nope"})
    assert r.status_code == 404 and r.json()["error"]["code"] == "merchant_not_found"
    r = client.get("/api/recommend", params={"merchant_id": "nike", "amount_cents": -5})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


def test_stack_nike():
    body = client.post("/api/stack", json={"merchant_id": "nike", "subtotal_cents": 10000}).json()
    assert body["coupon"]["coupon"]["code"] == "SAVE15"
    assert body["coupon"]["coupon"]["is_simulated"] is True
    assert body["charge_cents"] == 8500
    assert body["rewards_value_cents"] == 255
    assert body["total_value_pct"] == 17.55


def test_stack_by_name_and_unknown_store():
    body = client.post("/api/stack", json={"merchant_name": "trader joes", "subtotal_cents": 4250}).json()
    assert body["merchant"]["id"] == "trader-joes"
    first = client.post("/api/stack", json={"merchant_name": "Bob's Pizza Kitchen", "subtotal_cents": 3000}).json()
    assert first["merchant_known"] is False
    assert first["merchant"]["id"].startswith("unknown:")
    assert first["coupon"]["coupon"]["source"] in ("ai_simulated", "simulated_fallback")
    second = client.post("/api/stack", json={"merchant_name": "Bob's Pizza Kitchen", "subtotal_cents": 3000}).json()
    assert second["coupon"]["coupon"]["code"] == first["coupon"]["coupon"]["code"]  # cached


def test_stack_validation():
    r = client.post("/api/stack", json={"subtotal_cents": 1000})
    assert r.status_code == 422 and r.json()["error"]["code"] == "merchant_required"
    r = client.post("/api/stack", json={"merchant_id": "nike", "subtotal_cents": 0})
    assert r.status_code == 422
    r = client.post("/api/stack", json={"merchant_id": "nike", "subtotal_cents": 100, "rewards_value_cents": 9})
    assert r.status_code == 422  # unknown fields rejected


def test_deals():
    body = client.get("/api/deals").json()
    assert [c["id"] for c in body["categories"]] == ["meals", "clothing", "travel"]
    clothing = client.get("/api/deals", params={"category": "clothing"}).json()["categories"]
    assert len(clothing) == 1
    nike = next(d for d in clothing[0]["deals"] if d["merchant"]["id"] == "nike")
    assert nike["total_value_pct"] == 17.55


def test_transactions_rejects_client_totals():
    r = client.post(
        "/api/transactions",
        json={
            "idempotency_key": "abcdefgh-1234",
            "merchant_id": "nike",
            "subtotal_cents": 1000,
            "card_used_id": "apple-card",
            "channel": "store",
            "missed_cents": 0,
        },
    )
    assert r.status_code == 422


def test_card_benefits_endpoint():
    body = client.get("/api/wallet/chase-freedom/benefits").json()
    assert body["card"]["id"] == "chase-freedom" and body["is_demo_data"] is True
    assert body["benefits"][-1]["kind"] == "base"
    assert [s["merchant_id"] for s in body["best_at"]][:1] == ["costco"]
    amex = client.get("/api/wallet/amex-gold/benefits").json()
    assert amex["not_accepted_at"][0] == {
        "merchant_id": "costco", "merchant_name": "Costco", "emoji": "📦", "yield_pct": None, "accepts": ["visa"],
    }
    r = client.get("/api/wallet/no-such-card/benefits")
    assert r.status_code == 404 and r.json()["error"]["code"] == "card_not_found"
