"""POST /api/cart/parse and the simulated coupons for unknown stores.

Gemini is the network boundary. Every test replaces gemini._get_client with a
fake (or with one that raises GeminiUnavailable), so results never depend on a
key in backend/.env. Set GEMINI_LIVE=1 to also run the live tests against the
real API with the screenshots in tests/fixtures/.
"""

import asyncio
import dataclasses
import json
import os
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import gemini
from config import settings
from main import app

client = TestClient(app)
FIXTURES = Path(__file__).parent / "fixtures"
PNG = (FIXTURES / "cart_lululemon.png").read_bytes()

LULULEMON_REPLY = {
    "is_cart": True,
    "merchant_name": "lululemon",
    "category": "apparel",
    "items": [
        {"name": 'Align High-Rise Pant 25"', "qty": 1, "line_total": 98.0},
        {"name": "Swiftly Tech Short-Sleeve Shirt 2.0", "qty": 2, "line_total": 156.0},
    ],
    "subtotal": 254.0,
    "shipping": 0,
}
BIKESHOP_REPLY = {
    "is_cart": True,
    "merchant_name": "Greenpoint Cycle Works",
    "category": "general",
    "items": [
        {"name": "Commuter Helmet MIPS", "qty": 1, "line_total": 64.99},
        {"name": "U-Lock with Cable", "qty": 1, "line_total": 42.5},
        {"name": "Inner Tube 700x32c", "qty": 3, "line_total": 24.0},
    ],
    "subtotal": 131.49,
    "shipping": 9.95,
}
COUPON_REPLY = {"code": "CYCLE15", "discount_pct": 15, "description": "15% off cycling gear", "category": "general"}


class FakeGemini:
    """Stands in for genai.Client (and its .aio and .aio.models). Each call takes
    the next reply: a dict (sent as JSON text), a raw string, an exception to
    raise, or HANG to never answer."""

    HANG = object()

    def __init__(self, *replies):
        self.replies = list(replies)
        self.calls = 0
        self.aio = self.models = self

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass

    async def generate_content(self, **_):
        reply = self.replies[min(self.calls, len(self.replies) - 1)]
        self.calls += 1
        if reply is FakeGemini.HANG:
            await asyncio.sleep(3600)
        if isinstance(reply, Exception):
            raise reply
        return SimpleNamespace(text=json.dumps(reply) if isinstance(reply, dict) else reply)


@pytest.fixture(autouse=True)
def empty_coupon_cache():
    gemini._coupon_cache.clear()
    yield
    gemini._coupon_cache.clear()


@pytest.fixture
def no_key(monkeypatch):
    def unavailable():
        raise gemini.GeminiUnavailable("Gemini isn't configured.")

    monkeypatch.setattr(gemini, "_get_client", unavailable)


@pytest.fixture
def fake(monkeypatch):
    def install(*replies):
        fake_client = FakeGemini(*replies)
        monkeypatch.setattr(gemini, "_get_client", lambda: fake_client)
        return fake_client

    return install


def upload(data: bytes = PNG, filename: str = "cart.png", content_type: str = "image/png"):
    return client.post("/api/cart/parse", files={"file": (filename, data, content_type)})


def assert_sample(body: dict):
    assert body["source"] == "sample" and body["is_sample"] is True
    assert body["cart"]["merchant_id"] == "nike"
    assert body["stack"]["total_value_pct"] == 17.55


# --------------------------------------------------------------------------- request validation


def test_sample_cart_on_request():
    r = client.post("/api/cart/parse", data={"use_sample": "true"})
    assert r.status_code == 200
    body = r.json()
    assert_sample(body)
    assert body["warning"] is None
    cart = body["cart"]
    assert cart["merchant_name"] == "Nike" and cart["category"] == "apparel"
    assert sum(i["price_cents"] for i in cart["items"]) == cart["subtotal_cents"] == 10000
    stack = body["stack"]
    assert stack["coupon"]["coupon"]["code"] == "SAVE15"
    assert stack["winner_card_id"] == "apple-card" and stack["rewards_value_cents"] == 255


@pytest.mark.parametrize("data", [None, {"use_sample": "false"}])
def test_requires_file_or_sample(data):
    r = client.post("/api/cart/parse", data=data)
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


@pytest.mark.parametrize(
    "data, filename, content_type",
    [
        (b"%PDF-1.7 not an image", "cart.pdf", "application/pdf"),
        (b"\x00\x00\x00\x18ftypheic", "cart.png", "image/png"),  # HEIC bytes with a PNG label
        (b"", "cart.png", "image/png"),
    ],
)
def test_rejects_files_that_are_not_png_jpeg_or_webp(data, filename, content_type):
    r = upload(data, filename, content_type)
    assert r.status_code == 415 and r.json()["error"]["code"] == "unsupported_media_type"


def test_accepts_image_by_content_not_label(fake):
    fake(LULULEMON_REPLY)
    r = upload(PNG, "cart", "application/octet-stream")
    assert r.status_code == 200 and r.json()["source"] == "gemini"


def test_rejects_oversized_upload():
    too_big = PNG + b"\x00" * (settings.max_upload_bytes + 1 - len(PNG))
    r = upload(too_big)
    assert r.status_code == 413 and r.json()["error"]["code"] == "payload_too_large"


# --------------------------------------------------------------------------- Gemini parsing


def test_known_merchant_cart(fake):
    fake(LULULEMON_REPLY)
    body = upload().json()
    assert body["source"] == "gemini" and body["is_sample"] is False and body["warning"] is None
    cart = body["cart"]
    assert cart["merchant_id"] == "lululemon" and cart["merchant_name"] == "Lululemon"
    assert [(i["qty"], i["price_cents"]) for i in cart["items"]] == [(1, 9800), (2, 15600)]
    assert cart["subtotal_cents"] == 25400 and cart["shipping_cents"] == 0
    assert body["stack"]["coupon"]["coupon"]["code"] == "LULU20"
    assert body["stack"]["coupon"]["savings_cents"] == 2000


def test_unknown_merchant_cart_gets_ai_coupon(fake):
    gemini_client = fake(BIKESHOP_REPLY, COUPON_REPLY)
    body = upload().json()
    cart = body["cart"]
    assert cart["merchant_id"] == "unknown:greenpointcycleworks"
    assert [i["price_cents"] for i in cart["items"]] == [6499, 4250, 2400]
    assert cart["subtotal_cents"] == 13149 and cart["shipping_cents"] == 995
    coupon = body["stack"]["coupon"]["coupon"]
    assert coupon["code"] == "CYCLE15" and coupon["source"] == "ai_simulated" and coupon["is_simulated"] is True
    assert gemini_client.calls == 2


def test_missing_subtotal_uses_item_sum_and_unshown_shipping_is_null(fake):
    fake({**LULULEMON_REPLY, "subtotal": 0, "shipping": None})
    cart = upload().json()["cart"]
    assert cart["subtotal_cents"] == 25400 and cart["shipping_cents"] is None


@pytest.mark.parametrize(
    "reply",
    [
        "not json",
        "",
        {**LULULEMON_REPLY, "is_cart": False},
        {**LULULEMON_REPLY, "items": []},
        {**LULULEMON_REPLY, "items": [], "subtotal": 0},
        {**LULULEMON_REPLY, "merchant_name": "  "},
        {**LULULEMON_REPLY, "items": [{"name": "Pant", "qty": 0, "line_total": 98.0}]},
        RuntimeError("503 UNAVAILABLE"),
    ],
    ids=["invalid-json", "empty", "not-a-cart", "no-items", "nothing", "no-store", "bad-qty", "api-error"],
)
def test_gemini_failures_fall_back_to_sample(fake, reply):
    fake(reply)
    r = upload()
    assert r.status_code == 200
    body = r.json()
    assert_sample(body)
    assert body["warning"]


def test_gemini_timeout_falls_back_to_sample(fake, monkeypatch):
    monkeypatch.setattr(gemini, "settings", dataclasses.replace(settings, gemini_timeout_s=0.05))
    fake(FakeGemini.HANG)
    body = upload().json()
    assert_sample(body)
    assert body["warning"]


def test_no_key_falls_back_to_sample(no_key):
    body = upload().json()
    assert_sample(body)
    assert body["warning"]


# --------------------------------------------------------------------------- simulated coupons


def stack_for(name: str) -> dict:
    return client.post("/api/stack", json={"merchant_name": name, "subtotal_cents": 3000}).json()


def test_ai_coupon_is_cached_per_store(fake):
    gemini_client = fake({"code": "JOESPIZZA15", "discount_pct": 15, "description": "15% off", "category": "dining"})
    first = stack_for("Joe's Pizza")
    again = stack_for("joes pizza")
    assert first["coupon"]["coupon"]["code"] == again["coupon"]["coupon"]["code"] == "JOESPIZZA15"
    assert first["coupon"]["coupon"]["source"] == "ai_simulated"
    assert first["merchant"]["category"] == "dining" and first["winner_card_id"] == "amex-gold"
    assert gemini_client.calls == 1


def test_ai_coupon_is_cleaned_and_clamped(fake):
    fake({"code": "save big 99!!", "discount_pct": 80, "description": "Huge sale", "category": "not-a-category"})
    body = stack_for("Mystery Outlet")
    coupon = body["coupon"]["coupon"]
    assert coupon["code"] == "SAVEBIG99" and coupon["value"] == 25.0
    assert body["merchant"]["category"] == "general"


@pytest.mark.parametrize("reply", [RuntimeError("boom"), "not json", {**COUPON_REPLY, "code": "!!"}])
def test_coupon_falls_back_when_gemini_fails(fake, reply):
    gemini_client = fake(reply)
    expected = gemini.fallback_coupon("Corner Hardware").coupon.code
    first = stack_for("Corner Hardware")
    again = stack_for("Corner Hardware")
    assert first["coupon"]["coupon"]["source"] == "simulated_fallback"
    assert first["coupon"]["coupon"]["code"] == again["coupon"]["coupon"]["code"] == expected
    assert gemini_client.calls == 1


def test_coupon_without_key_uses_fallback(no_key):
    assert stack_for("Corner Hardware")["coupon"]["coupon"]["source"] == "simulated_fallback"


def test_known_store_never_calls_gemini(fake):
    gemini_client = fake(COUPON_REPLY)
    assert stack_for("NIKE")["merchant"]["id"] == "nike"
    assert gemini_client.calls == 0


# --------------------------------------------------------------------------- live Gemini (opt in)

live = pytest.mark.skipif(
    os.getenv("GEMINI_LIVE") != "1" or not settings.gemini_configured,
    reason="set GEMINI_LIVE=1 and GEMINI_API_KEY to call the real Gemini API",
)


@live
def test_live_known_merchant_screenshot():
    body = upload((FIXTURES / "cart_lululemon.png").read_bytes()).json()
    assert body["source"] == "gemini", body["warning"]
    assert body["cart"]["merchant_id"] == "lululemon"
    assert body["cart"]["subtotal_cents"] == 25400 and body["cart"]["shipping_cents"] == 0
    assert [(i["qty"], i["price_cents"]) for i in body["cart"]["items"]] == [(1, 9800), (2, 15600)]


@live
def test_live_unknown_store_screenshot():
    body = upload((FIXTURES / "cart_unknown_store.png").read_bytes()).json()
    assert body["source"] == "gemini", body["warning"]
    assert body["cart"]["merchant_id"] == "unknown:greenpointcycleworks"
    assert body["cart"]["subtotal_cents"] == 13149 and body["cart"]["shipping_cents"] == 995
    assert body["stack"]["coupon"]["coupon"]["source"] == "ai_simulated"


@live
def test_live_non_cart_image_falls_back():
    body = upload((FIXTURES / "not_a_cart.png").read_bytes()).json()
    assert_sample(body)
    assert body["warning"]
