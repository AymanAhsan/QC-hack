# API contract

This file plus `frontend/src/types.ts` and `backend/schemas.py` are the agreed contract. Change a field name only through a PR that updates all three. Interactive docs: http://localhost:8000/docs while the backend runs.

All data is demo data. Every response that carries cards, coupons, or history includes `"is_demo_data": true`. Payments are simulated; coupons are never verified offers.

## Conventions

| Topic | Rule |
|---|---|
| Base URL | Same origin `/api/...`. In development the Vite dev server proxies `/api` to `http://127.0.0.1:8000`. Override with `VITE_API_BASE_URL`. |
| Money | Integer **cents**. Fields end in `_cents`. `4250` = $42.50. |
| Percent | Percent units, 2 decimals. Fields end in `_pct`. `7.2` = 7.2%. |
| Multipliers | `multiplier` is "x points" for points cards, "% cash back" for cash cards (cash cards have `cpp = 1`). |
| IDs | Lowercase kebab-case: `amex-gold`, `trader-joes`. Unknown typed stores get `unknown:<slug>`, e.g. `unknown:bobspizzakitchen`. |
| Timestamps | ISO 8601 UTC strings. |
| Request bodies | JSON, unknown fields rejected with 422. Clients cannot send reward totals. |

### Units and rounding

The backend uses `Decimal` throughout (`backend/engine.py`).

- `yield_pct = multiplier × cpp`
- `value_cents = round_half_up(amount_cents × yield_pct / 100)`
- `points = round_half_up(amount_dollars × multiplier)` for points cards; `null` for cash cards; `0` if rejected.
- Percent outputs round half up to 2 decimals.
- Missed = `max(best_possible_cents − earned_cents, 0)` using the already-rounded cent values, so the displayed numbers always subtract exactly.

Check values: $42.50 at Trader Joe's on Amex Gold = 170 points = $3.06. $100 at Nike with SAVE15 = $85 charged, Apple Card 3% = $2.55, total value $17.55 = 17.55%.

### Engine rules

1. Rate lookup: merchant-specific rate, then category rate, then base rate.
2. A card whose network the merchant does not accept is **rejected**: `accepted: false`, `rank: null`, `value_cents: 0`. Rejected cards are listed after all accepted cards and can never win.
3. Accepted cards rank by `value_cents` desc, then `yield_pct` desc, then wallet order.
4. No accepted card: `winner_card_id: null`, `no_accepted_card: true`, `why: null`.
5. Coupons: percent and fixed coupons apply to the item subtotal; fixed savings never exceed the subtotal; `max_discount_cents` caps savings; `min_spend_cents` must be met; shipping coupons need a known `shipping_cents`, otherwise they are ineligible with reason `"Shipping cost unknown"`. The single coupon with the largest savings is applied (first wins ties).
6. Triple Stack: `charge = subtotal + shipping − coupon savings`; rewards are computed on `charge`; `total_value_pct = (coupon savings + rewards) / (subtotal + shipping)`. "Triple Stack" is three presentation layers (coupon, card, combined), not a third reward.
7. Missed rewards compare the used card and the best card on the same post-coupon charge.

## Errors

Every non-2xx response:

```json
{ "error": { "code": "merchant_not_found", "message": "Unknown merchant id 'nope'.", "details": {} } }
```

| Status | `code` | When |
|---|---|---|
| 404 | `merchant_not_found`, `card_not_found`, `coupon_not_found`, `not_found` | Unknown id |
| 413 | `payload_too_large` | Upload over `MAX_UPLOAD_BYTES` (5 MB default) |
| 415 | `unsupported_media_type` | Upload is not PNG, JPEG, or WEBP |
| 422 | `validation_error` | Bad query/body; `details.errors` lists fields |
| 409 | `idempotency_conflict` | An `idempotency_key` was reused for a different purchase |
| 422 | `merchant_required`, `coupon_not_eligible`, `invalid_amount` | Business-rule failures |
| 501 | `not_implemented` | Endpoint registered but its workstream has not landed |
| 503 | `database_unavailable` | Write could not be persisted (never silently switched to another DB) |

The frontend client (`frontend/src/api.ts`) throws `ApiError` with `status`, `code`, `message`. Network failures use `status: 0` with code `network_error`; timeouts (15 s, 45 s for uploads) use `timeout`.

### Loading and failure behaviour (frontend)

- Every screen shows a loading state, and an inline `ErrorNotice` with retry on failure. No blank screens.
- `501 not_implemented` renders as "waiting on another workstream" during development.
- Scan: if cart parsing fails the backend returns the labeled sample cart (`is_sample: true`); the user can always fall back to manual store + amount entry via `POST /api/stack`.

---

## GET /api/health

```json
{ "status": "ok", "db_mode": "sqlite", "gemini_configured": false, "version": "0.1.0" }
```

`db_mode`: `timescale` | `postgres` | `sqlite` | `sqlite-fallback` (Tiger Data unreachable at startup and `ALLOW_SQLITE_FALLBACK=true`) | `not_initialized`. Shown in the dev badge. See [AYMAN.md](AYMAN.md) for how the database is chosen.

## GET /api/wallet

```json
{
  "cards": [
    {
      "id": "amex-gold", "name": "Amex Gold", "issuer": "American Express", "network": "amex", "last4": "4821",
      "reward_type": "points", "cpp": 1.8, "base_rate": 1.0,
      "category_rates": { "dining": 4.0, "grocery": 4.0, "airfare": 3.0 }, "merchant_rates": {},
      "gradient": ["#d4af37", "#8a6d1d"], "glow": "#f5c84c", "text_color": "#1a1405", "is_default_debit": false
    }
  ],
  "default_debit_card_id": "everyday-debit",
  "is_demo_data": true
}
```

Cards: `amex-gold`, `chase-sapphire`, `chase-freedom`, `venture-x`, `apple-card`, `everyday-debit`.

## GET /api/locations

Mock in-store locations sorted by fake distance.

```json
{
  "locations": [
    { "id": "trader-joes", "address": "142 E 14th St, New York, NY", "distance_m": 120, "merchant": { "...": "Merchant, see below" } }
  ],
  "is_demo_data": true
}
```

Merchant object (also used by recommend, stack, deals):

```json
{
  "id": "costco", "name": "Costco", "known": true,
  "category": "wholesale_club", "category_label": "Wholesale club",
  "mcc": "5300", "mcc_label": "Wholesale Clubs", "mcc_note": "Warehouse club, not a supermarket; Visa-only terminals",
  "accepts": ["visa"], "channels": ["store"], "typical_cents": 18740,
  "deal_feed": null, "emoji": "📦", "coupons": []
}
```

Coupon object:

```json
{
  "code": "SAVE15", "kind": "percent", "value": 15.0, "description": "15% off orders of $50+",
  "min_spend_cents": 5000, "max_discount_cents": null,
  "source": "demo_catalog", "is_simulated": true, "label": "Demo coupon · not a verified offer"
}
```

`kind`: `percent` (value = percent), `fixed` (value = cents), `shipping` (value unused).
`source` (provenance): `demo_catalog` (hardcoded demo code), `ai_simulated` (generated by Gemini), `simulated_fallback` (generated offline when Gemini is unavailable). All coupons are `is_simulated: true`; always show `label` next to the code.

## GET /api/recommend

Query: `merchant_id` (required), `amount_cents` (optional, > 0, defaults to the merchant's `typical_cents`).

`GET /api/recommend?merchant_id=trader-joes`

```json
{
  "merchant": { "id": "trader-joes", "...": "..." },
  "amount_cents": 4250,
  "winner_card_id": "amex-gold",
  "no_accepted_card": false,
  "ranking": [
    {
      "card_id": "amex-gold", "card_name": "Amex Gold", "network": "amex",
      "accepted": true, "rejection_reason": null,
      "multiplier": 4.0, "rate_source": "category", "rate_label": "4x points on Grocery",
      "yield_pct": 7.2, "points": 170, "value_cents": 306, "rank": 1, "is_winner": true
    }
  ],
  "why": {
    "network": { "network": "amex", "label": "Amex accepted here", "rejections": [] },
    "mcc": { "code": "5411", "label": "Grocery Stores, Supermarkets", "category": "grocery", "category_label": "Grocery", "note": "Classified as a supermarket" },
    "rate": { "multiplier": 4.0, "source": "category", "label": "4x points on Grocery" },
    "valuation": { "reward_type": "points", "base_yield_pct": 1.8, "multiplier": 4.0, "cpp": 1.8, "net_yield_pct": 7.2, "summary": "1.8% base → 4x points @ 1.8¢ = 7.2% net value" },
    "advantage": {
      "runner_up": { "card_id": "venture-x", "card_name": "Venture X", "value_cents": 119, "advantage_cents": 187, "advantage_pct": 4.4 },
      "default_debit": { "card_id": "everyday-debit", "card_name": "Everyday Debit", "value_cents": 0, "advantage_cents": 306, "advantage_pct": 7.2 }
    },
    "amount_cents": 4250
  },
  "is_demo_data": true
}
```

Costco: `winner_card_id: "chase-freedom"`; Amex Gold and Apple Card have `accepted: false`, `rank: null`, and `why.network.rejections` contains `{"card_id": "amex-gold", "network": "amex", "label": "Amex rejected by Costco terminal"}`.

Expected winners: Trader Joe's → Amex Gold 7.2%, Costco → Chase Freedom 5%, Target → Venture X 2.8%, Delta → Amex Gold 5.4%, Marriott → Chase Sapphire 3%, Nike → Apple Card 3%.

## POST /api/stack

Body: provide `merchant_id` or `merchant_name` (`merchant_id` wins). Unknown names get a cached simulated coupon and accept all networks (demo assumption).

```json
{ "merchant_id": "nike", "subtotal_cents": 10000, "shipping_cents": null }
```

Response:

```json
{
  "merchant": { "id": "nike", "...": "..." },
  "merchant_known": true,
  "subtotal_cents": 10000,
  "shipping_cents": null,
  "original_total_cents": 10000,
  "coupon": { "coupon": { "code": "SAVE15", "...": "..." }, "eligible": true, "reason": null, "savings_cents": 1500 },
  "coupons_considered": [
    { "coupon": { "code": "SAVE15" }, "eligible": true, "reason": null, "savings_cents": 1500 },
    { "coupon": { "code": "WELCOME10" }, "eligible": true, "reason": null, "savings_cents": 1000 },
    { "coupon": { "code": "FREESHIP" }, "eligible": false, "reason": "Shipping cost unknown", "savings_cents": 0 }
  ],
  "charge_cents": 8500,
  "winner_card_id": "apple-card",
  "no_accepted_card": false,
  "ranking": [ { "card_id": "apple-card", "value_cents": 255, "yield_pct": 3.0, "...": "CardEvaluation" } ],
  "rewards_value_cents": 255,
  "total_value_cents": 1755,
  "total_value_pct": 17.55,
  "is_demo_data": true
}
```

## POST /api/cart/parse (owner: Nazeef)

`multipart/form-data`:
- `file`: PNG, JPEG, or WEBP screenshot, at most `MAX_UPLOAD_BYTES` (5 MB), **or**
- `use_sample=true` for the labeled sample cart.

Gemini output is validated before use. On any Gemini failure (no key, timeout, invalid JSON) the endpoint returns the sample cart with `source: "sample"`, `is_sample: true`, and a `warning` explaining why.

```json
{
  "source": "gemini",
  "is_sample": false,
  "warning": null,
  "cart": {
    "merchant_name": "Nike", "merchant_id": "nike", "category": "apparel",
    "items": [ { "name": "Pegasus 41", "qty": 1, "price_cents": 10000 } ],
    "subtotal_cents": 10000, "shipping_cents": null
  },
  "stack": { "...": "StackResponse for the cart" }
}
```

`price_cents` is the line total (qty × unit price).

## GET /api/deals

Query: `category` optional, one of `meals`, `clothing`, `travel`. Each deal is a Triple Stack at the merchant's `typical_cents`, sorted by `total_value_pct` desc.

```json
{
  "categories": [
    {
      "id": "clothing", "label": "Clothing", "emoji": "👕",
      "deals": [
        {
          "merchant": { "id": "nike", "...": "..." },
          "example_subtotal_cents": 10000,
          "coupon": { "coupon": { "code": "SAVE15" }, "savings_cents": 1500, "eligible": true, "reason": null },
          "winner_card_id": "apple-card", "winner_card_name": "Apple Card", "card_yield_pct": 3.0,
          "rewards_value_cents": 255, "total_value_cents": 1755, "total_value_pct": 17.55,
          "headline": "SAVE15 + Apple Card = 17.55% back"
        }
      ]
    }
  ],
  "is_demo_data": true
}
```

Opening a deal in Scan: `useNav().openScan({ merchantId: deal.merchant.id, subtotalCents: deal.example_subtotal_cents })`.

## POST /api/transactions (owner: Ayman)

Logs one simulated purchase. The server computes every reward value with `engine.evaluate_purchase`; clients send only the inputs.

```json
{
  "idempotency_key": "3f0c8f9e-3c41-4b8e-9d0a-0b3c2f6e9a11",
  "merchant_id": "trader-joes",
  "subtotal_cents": 4250,
  "shipping_cents": null,
  "coupon_code": null,
  "card_used_id": "amex-gold",
  "channel": "store",
  "source": "wallet"
}
```

- `idempotency_key`: generate once per purchase attempt with `newIdempotencyKey()` from `api.ts`, and **reuse it on retries**. A repeated key returns the original transaction with `duplicate: true` (HTTP 200) and writes nothing.
- `merchant_id` or `merchant_name` (unknown stores from Scan).
- `coupon_code` is re-validated server side (`coupon_not_found` / `coupon_not_eligible`).

Response (201 new, 200 duplicate):

```json
{
  "transaction": {
    "id": "b7c1…", "ts": "2026-10-09T17:02:11Z",
    "merchant_id": "trader-joes", "merchant_name": "Trader Joe's", "category": "grocery",
    "channel": "store", "source": "wallet",
    "subtotal_cents": 4250, "shipping_cents": null, "coupon_code": null, "coupon_savings_cents": 0,
    "amount_cents": 4250,
    "card_used_id": "amex-gold", "best_card_id": "amex-gold",
    "earned_cents": 306, "best_possible_cents": 306, "missed_cents": 0, "points_earned": 170,
    "is_simulated": true
  },
  "duplicate": false
}
```

After success the frontend calls `useNav().notifyTransactionLogged()` so Missed refetches.

## GET /api/missed (owner: Ayman)

Query: `days` (default 30, 1–365), `limit` for `recent` (default 50, 1–200). The window is **trailing** `days` days from now, not the calendar month; label it with `window_label`.

```json
{
  "window_days": 30,
  "window_label": "Last 30 days",
  "total_missed_cents": 4250,
  "total_earned_cents": 3120,
  "total_best_possible_cents": 7370,
  "transaction_count": 31,
  "daily": [ { "date": "2026-10-09", "missed_cents": 306, "earned_cents": 0, "count": 1 } ],
  "by_category": [ { "category": "grocery", "category_label": "Grocery", "missed_cents": 1820 } ],
  "recent": [ { "...": "Transaction, newest first" } ],
  "db_mode": "sqlite",
  "is_demo_data": true
}
```

`daily` covers every day in the window (zero-filled), oldest first, UTC dates.

## Backend module interfaces

| Module | Owner | Interface other modules rely on |
|---|---|---|
| `engine.py` | Omar | `rank_cards`, `triple_stack`, `evaluate_purchase`, `missed_rewards`, `EngineError(code, message)` |
| `services.py` | Omar | `await resolve_merchant(merchant_id, merchant_name) -> (Merchant, coupons)` |
| `serializers.py` | Omar | `stack_out`, `merchant_out`, `evaluation_out`, ... |
| `db.py` | Ayman | `init()` at startup (connect, migrate, seed idempotently); `mode() -> str`; `get_db()` FastAPI dependency |
| `transaction_service.py` | Ayman | `await record_purchase(db, TransactionCreate) -> (Transaction, duplicate)` |
| `gemini.py` | Nazeef | `await generate_coupon(name) -> SimulatedCoupon` (never raises, cached); `await parse_cart_image(bytes, mime) -> CartData` (raises `GeminiError`) |
