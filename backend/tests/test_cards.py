import pytest
from fastapi.testclient import TestClient

import db
from main import app

client = TestClient(app)


def add(user="ayman", **overrides):
    return client.post(f"/api/users/{user}/cards", json={"type": "amex-gold", "last4": "0042", **overrides})


def test_crud_is_scoped_to_owner_and_survives_restart(database):
    assert client.get("/api/users/ayman/cards").json()["cards"] == []
    response = add()
    assert response.status_code == 201
    card = response.json()
    assert (card["user_id"], card["type"], card["last4"], card["image"]) == (
        "ayman", "amex-gold", "0042", "/cards/amex-gold.svg"
    )
    path = f'/api/users/ayman/cards/{card["id"]}'
    assert client.get(path).json() == card
    other_path = f'/api/users/other/cards/{card["id"]}'
    assert client.get("/api/users/other/cards").json()["cards"] == []
    assert client.get(other_path).status_code == 404
    assert client.patch(other_path, json={"last4": "1234"}).status_code == 404
    assert client.delete(other_path).status_code == 404
    changed = client.patch(path, json={"type": "apple-card", "last4": "0001"}).json()
    assert changed["id"] == card["id"] and changed["last4"] == "0001"
    assert changed["network"] == "mastercard" and changed["image"] == "/cards/apple-card.svg"
    assert changed["cpp"] == 1 and changed["merchant_rates"]["nike"] == 3
    restarted = db.Database.open(None, database.store.path)
    db.use(restarted)
    assert client.get(path).json() == changed
    assert client.delete(path).status_code == 204
    assert client.get(path).status_code == 404
    assert client.delete(path).status_code == 404
    db.use(db.Database.open(None, database.store.path))
    assert client.get("/api/users/ayman/cards").json()["cards"] == []


@pytest.mark.parametrize("body", [
    {"type": "unknown", "last4": "1234"},
    {"type": "amex-gold", "last4": "123"},
    {"type": "amex-gold", "last4": "12345"},
    {"type": "amex-gold", "last4": "abcd"},
    {"type": "amex-gold", "last4": "١٢٣٤"},
    {"type": "amex-gold", "last4": 1234},
    {"type": "amex-gold", "last4": "1234", "user_id": "other"},
    {"type": "amex-gold", "last4": "1234", "cpp": 99},
])
def test_create_rejects_invalid_inputs(body):
    assert client.post("/api/users/ayman/cards", json=body).status_code == 422
    assert client.get("/api/users/ayman/cards").json()["cards"] == []


@pytest.mark.parametrize("body", [{}, {"type": None}, {"last4": None}, {"last4": "bad"}, {"image": "evil"}])
def test_patch_rejects_empty_null_and_derived_fields(body):
    card = add().json()
    assert client.patch(f'/api/users/ayman/cards/{card["id"]}', json=body).status_code == 422


def test_all_planned_types_and_duplicate_instances():
    for card_type in ("amex-gold", "chase-sapphire", "chase-freedom", "venture-x", "apple-card", "everyday-debit"):
        assert add(type=card_type).status_code == 201
    first, second = add().json(), add().json()
    assert first["id"] != second["id"]
    wallet = client.get("/api/users/ayman/cards").json()
    assert len(wallet["cards"]) == 8
    assert wallet["default_debit_card_id"] == wallet["cards"][5]["id"]


def test_empty_wallet_and_invalid_user_id():
    headers = {"X-User-ID": "empty"}
    assert client.get("/api/wallet", headers=headers).json()["default_debit_card_id"] is None
    recommendation = client.get("/api/recommend?merchant_id=costco", headers=headers).json()
    assert recommendation["ranking"] == [] and recommendation["no_accepted_card"] is True
    assert client.get("/api/users/invalid!user/cards").status_code == 422
    assert client.get("/api/wallet", headers={"X-User-ID": ""}).status_code == 422


def test_saved_wallet_drives_recommendations_stack_cart_deals_and_purchases():
    headers = {"X-User-ID": "ayman"}
    card = add(type="apple-card").json()
    assert client.get("/api/wallet", headers=headers).json()["cards"] == [card]
    recommendation = client.get("/api/recommend?merchant_id=nike&amount_cents=10000", headers=headers).json()
    assert recommendation["winner_card_id"] == card["id"]
    stack = client.post("/api/stack", headers=headers, json={"merchant_id": "nike", "subtotal_cents": 10000}).json()
    assert stack["winner_card_id"] == card["id"] and stack["rewards_value_cents"] == 255
    cart = client.post("/api/cart/parse", headers=headers, data={"use_sample": "true"}).json()
    assert cart["stack"]["winner_card_id"] == card["id"]
    deals = client.get("/api/deals?category=clothing", headers=headers).json()
    assert all(deal["winner_card_id"] == card["id"] for deal in deals["categories"][0]["deals"])
    body = {"idempotency_key": "card-purchase-key", "merchant_id": "nike", "subtotal_cents": 10000,
            "coupon_code": "SAVE15", "card_used_id": card["id"], "channel": "online"}
    purchase = client.post("/api/transactions", headers=headers, json=body)
    assert purchase.status_code == 201
    assert purchase.json()["transaction"]["earned_cents"] == 255
    # Another user cannot spend the card or replay this user's purchase.
    assert client.post("/api/transactions", headers={"X-User-ID": "other"}, json=body).status_code == 404
    client.delete(f'/api/users/ayman/cards/{card["id"]}')
    assert client.post("/api/transactions", headers=headers, json=body).json()["duplicate"] is True
    body["idempotency_key"] = "new-card-purchase-key"
    assert client.post("/api/transactions", headers=headers, json=body).status_code == 404


def test_demo_wallet_deletions_are_not_reseeded(database):
    assert client.delete("/api/users/demo/cards/amex-gold").status_code == 204
    db.use(db.Database.open(None, database.store.path))
    assert len(client.get("/api/wallet").json()["cards"]) == 5
