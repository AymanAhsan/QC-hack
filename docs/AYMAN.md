# Ayman: persistence and Missed

Branch: `Ayman/persistence-missed`. Implements PLANNING.md sections 5 and 7
(Missed), and the persistence portion of phase 3.

## Ownership and integration

This branch adds `backend/db.py`, migrations, seed logic, persistence contracts,
transaction and missed routers, tests, and `frontend/src/screens/Missed.tsx` with
feature-local components/styles. It does not edit `backend/main.py`, `data.py`,
`engine.py`, `gemini.py`, the frontend shell, navigation, `api.ts`, or the other
screens. `frontend/ayman-tests/` is an isolated validation/preview harness, not
the application's frontend scaffold. Move its development dependencies and
tests into Omar's shared test setup during integration if desired.

The shared scaffold and engine did not exist when this branch was created. The
following explicit seam keeps persistence usable without inventing a second
production rewards engine. Omar supplies a synchronous `EvaluatePurchase`
callable from the shared engine and mock data:

```python
from backend.persistence_models import PurchaseInput, PurchaseEvaluation

def evaluate_purchase(purchase: PurchaseInput) -> PurchaseEvaluation:
    # Resolve purchase.merchant and purchase.card_used using shared data.
    # For online purchases, apply only the selected coupon_code; without a
    # code, no coupon was applied. For store purchases, normally no coupon.
    # Rank accepted cards on that after-coupon amount using engine.py.
    # Calculate the selected card's rewards (zero for a rejected network).
    # Return these exact fields with Decimal monetary values:
    return PurchaseEvaluation(
        merchant=merchant.name,
        category=merchant.category,
        card_used=used_card.name,
        best_card=winner.name,
        amount=after_coupon,
        earned=used_reward_value,
        best_possible=winner_reward_value,
    )
```

The variable names inside that example are adapter outputs, not assumptions
about Omar's still-to-be-written engine API. Do not call Gemini inside this
adapter: resolve unknown merchants/coupons from Nazeef's cached stack metadata
or reject an unresolved purchase with `ValueError`/`KeyError`. The endpoint never
accepts client-calculated earned/best/missed values. All reward snapshots round
half up to cents, then `missed = max(best_possible - earned, 0)`. No real payment
is attempted.

In Omar's app lifespan, create one database, seed it, and include both routers:

```python
from backend.db import Database
from backend.seed import seed_demo_history
from backend.routers.transactions import create_transactions_router
from backend.routers.missed import create_missed_router

database = Database.from_env()
seed_demo_history(database, evaluate_purchase, seed_purchases)
app.include_router(create_transactions_router(database, evaluate_purchase))
app.include_router(create_missed_router(database))
```

`seed_purchases` is a list of `PurchaseInput` values using **the actual IDs from
shared data**. Use four choices: three weaker/debit purchases and one winning
card purchase, spread across Trader Joe's, Costco, and Nike. The seeder cycles
them into 30 purchases, one per day over the preceding 30 days. It uses the same
evaluation adapter as live submissions. Seeding is atomic, runs only on an
empty database, and has a persistent marker to prevent re-seeding on restart.

## HTTP contract for Yousef and Nazeef

`POST /api/transactions` accepts:

```json
{
  "merchant": "<shared merchant ID or resolvable name>",
  "amount": 100,
  "card_used": "<shared card ID>",
  "channel": "online",
  "coupon_code": "SAVE15",
  "request_id": "e1ba2b44-bf2f-4fba-9024-b4b562b23f8c"
}
```

`amount` is the original subtotal in USD, with at most two decimal places.
`channel` is `store` (default) or `online`. `coupon_code` is optional.
`request_id` is an optional UUID: generate it **once for a purchase** and reuse
it for retries. The server assigns one if omitted. A first submission returns
201; a stored retry returns 200 with its original snapshot; reusing the ID for
different purchase fields returns 409. Invalid inputs return 422. Every field
other than those above is rejected.

The response is a transaction:

```json
{
  "id": "e1ba2b44-bf2f-4fba-9024-b4b562b23f8c",
  "ts": "2026-10-09T16:00:00Z",
  "merchant": "Nike",
  "category": "retail",
  "amount": 85,
  "card_used": "Everyday Debit",
  "best_card": "Apple Card",
  "earned": 0,
  "best_possible": 2.55,
  "missed": 2.55,
  "channel": "online"
}
```

This example represents $100 at Nike with SAVE15 on the debit card. Stored
`amount` is the **post-coupon $85 rewards basis**, not the submitted subtotal.
Coupon savings are not included in missed cash back. Store/card display names
and rewards are server-derived.

`GET /api/transactions?limit=50&offset=0` returns a latest-first transaction
array, across all dates. Limits are 1–100; offsets are 0–10000.

`GET /api/missed?limit=50` returns:

- `window_days: 30`, `window_start`, `window_end`, `currency: "USD"`.
- `total_missed`, `total_earned`, `best_possible`, `transaction_count`.
- `daily: [{ date: "YYYY-MM-DD", missed, transaction_count }]`, including zero days.
- `by_category: [{ category, missed, transaction_count }]`, descending by missed.
- `transactions`, latest first, limited to the same trailing window.

Totals aggregate **all** purchases in the window even when recent history is
limited. The interval is `[now - 30 days, now]`, excluding future records. UTC
calendar buckets give 31 entries when the rolling interval starts mid-day: the
first and last dates are partial days. SQLite and Tiger Data share these rules.
History rows contain no raw database credentials or idempotency fingerprints.

## Frontend hookup for Omar

```tsx
import Missed from "./screens/Missed";

<Missed refreshKey={transactionRevision} />
```

The default loader fetches `/api/missed`, so configure the shared Vite `/api`
proxy. Alternatively pass `loadMissed={(signal) => api.getMissed(signal)}` using
a stable function reference. The feature contracts live in
`frontend/src/features/missed/types.ts` and can be re-exported from shared types.

If inactive tabs unmount, Missed fetches fresh history on re-entry. If tabs stay
mounted, increment `transactionRevision` after successful Wallet/Scan saves.
An alternative notification contract is
`window.dispatchEvent(new Event("transactions:changed"))`; use one mechanism to
avoid duplicate requests. Returning to the browser also refreshes history.
In-flight requests are aborted on cleanup, and obsolete responses are ignored.

The screen owns no tab bar or phone/desktop frame. Its CSS is scoped with
`missed-` prefixes, fits narrow phones and a shared desktop container, and uses
safe-area padding. The counter respects reduced motion. The chart has an
accessible daily table and a keyboard-friendly day selector. Errors retain the
previous data and offer retry; empty history explains how to start.

## Storage and configuration

Merge `backend/requirements-ayman.txt` into the shared backend requirements.
Merge the placeholders in `backend/.env.ayman.example` into shared configuration.
The host app must load its `.env` before calling `Database.from_env()`; this
feature reads process environment variables without introducing dotenv setup.

- `DATABASE_URL`: optional PostgreSQL/Tiger Data connection string, with the
  provider's required SSL configuration. Never commit it.
- `SQLITE_PATH`: default `backend/credit_optimizer.sqlite3` relative to the
  process working directory. Use the same durable path on restarts.

SQL migrations are idempotent and applied at startup. Tiger Data requires the
TimescaleDB extension to be installed already and schema-creation permissions.
The hypertable partitions on `ts`. Its `(id, ts)` primary key is supplemented
by a regular request registry so IDs cannot be replayed under different
timestamps. Daily aggregation uses UTC `time_bucket`; SQLite stores integer
cents and normalized UTC timestamps.

SQLite always journals transactions. Successful remote writes/read snapshots
are mirrored locally. Any remote startup, read, or write failure selects SQLite
for the rest of the session and logs a warning without driver exception text.
The next app restart reconciles history by UUID before using Tiger Data again.
This also handles a connection loss after a remote write committed. The local
copy contains previously synchronized history; purchases made by other remote
clients after a disconnection become available at the next reconciliation.
There is no automatic timer reconnect or user-visible database setup flow.

This is a single-demo-wallet store, not a multi-user account system. Syncing the
small demo history is intentionally simple; production scale would need
incremental synchronization, pooling, and account isolation.

The migration is for this new repository's schema; it does not upgrade an
older hand-created `transactions` table with a different column layout.

Tiger Data's [hypertable documentation](https://www.tigerdata.com/docs/learn/hypertables/creating-and-configuring-hypertables)
and Psycopg's [transaction documentation](https://www.psycopg.org/psycopg3/docs/basic/transactions.html)
describe the underlying database APIs used here.

## Run and verify in PowerShell

From the repository root:

```powershell
python -m venv .venv-ayman
.\.venv-ayman\Scripts\python.exe -m pip install -r backend/requirements-ayman.txt
.\.venv-ayman\Scripts\python.exe -m pytest backend/tests -q
```

These API tests mount only Ayman's routers in a test FastAPI app, with a
test-only rewards adapter. Shared app startup remains Omar's responsibility.
SQLite tests require no key, network access, or running database.

For the isolated Missed validation harness:

```powershell
Set-Location frontend/ayman-tests
npm ci
npm test
npm run typecheck
npm run build
npm run preview:missed
```

The component preview is at `http://127.0.0.1:5174` and uses labeled fixture
data, independent of the shared API. It does not pretend to submit purchases.
After shared integration, verify the real API flow:

1. Enter Missed: seeded total counts up, daily chart and history render.
2. Log a Wallet purchase with the winning card: one new row, zero missed.
3. Log a $100 Nike Scan subtotal with SAVE15 and the debit card: $85 amount and
   $2.55 missed; the summary rises by $2.55.
4. Retry the same request ID: one row, unchanged total.
5. Restart: the new rows survive and seed rows do not duplicate.
6. Simulate a database outage: history continues from the SQLite journal.

For the opt-in live database test, set `TEST_DATABASE_URL` to a **disposable
TimescaleDB database** and run `python -m pytest backend/tests/test_tigerdata.py`.
The test creates and drops only its generated `ayman_test_<uuid>` schema; it
does not run against the application schema. Without that setting it skips.

Feature-local Ruff configuration is in `backend/ruff-ayman.toml`. With Ruff
installed: `ruff check --config backend/ruff-ayman.toml backend/db.py
backend/persistence_models.py backend/transaction_service.py backend/seed.py
backend/routers/transactions.py backend/routers/missed.py backend/tests`.
Omar can merge this policy into the shared scaffold's lint configuration.

## Rendered preview

![Missed component with fixture data](ayman/missed-preview.jpg)
