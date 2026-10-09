# Planning

Implementation plan for the Credit Card Optimizer. See [PROJECT.md](PROJECT.md) for what the app is and what each feature does; this file covers how it gets built.

---

## 1. Decisions

All four are settled.

| # | Decision | Outcome | Why |
|---|---|---|---|
| 1 | Offline fallbacks for Gemini and the database | **Yes.** Sample cart when Gemini fails, local SQLite when no database URL is set | A live demo should not die on venue Wi-Fi. Cost is a second small database code path. |
| 2 | Stacking maths | **Rewards on the post-coupon price** | Defensible if a judge checks the numbers. Slightly lower than simply adding the percentages. |
| 3 | "This month" window for missed cash back | **Trailing 30 days** | A calendar month looks empty if the demo falls early in the month. |
| 4 | Project folder | **`C:\Users\Admin\QC-hack`** (this repository) | Code goes in `backend/` and `frontend/` at the repo root. |

Needed from you: a Gemini API key and a Tiger Data connection string. Phases 1 and 2 can be built without either.

---

## 2. Repository layout

```
backend/
  main.py          FastAPI app and routes
  data.py          Mock cards, merchants, coupons, locations
  engine.py        Card ranking, Triple Stack, missed cash back (pure functions)
  gemini.py        Cart screenshot parsing, coupon generation, fallbacks
  db.py            Tiger Data access, schema, seeding
  requirements.txt
  .env.example
frontend/
  index.html       PWA meta tags
  public/manifest.webmanifest
  src/
    App.tsx        Phone frame and tab bar
    api.ts         Typed fetch helpers
    screens/
      Wallet.tsx   In-store flow
      Scan.tsx     Cart scan and Triple Stack
      Deals.tsx    Category feed
      Missed.tsx   Missed-cashback counter and history
    components/
      CreditCard.tsx
      Odometer.tsx
      WhyDrawer.tsx
      PayButton.tsx
```

---

## 3. Mock data

### Cards

Each card has: `id`, `name`, `network`, `last4`, `cpp` (cents per point), `base` multiplier, `rates` by category, `merchant_rates` for store-specific bonuses, and gradient and glow colours.

Saved card instances also have `user_id` and `type` (one of the six card slugs
below). Only the type and four-digit suffix are client inputs; reward settings
and the `image` URL are derived from the mock catalog. Per-user CRUD persists in
SQLite or Postgres. The Wallet screen overlays the suffix at the bottom left of
the card artwork. See `docs/API.md` for the endpoints and demo user selector.

| Card | Network | Value per point | Bonus rates | Base |
|---|---|---|---|---|
| Amex Gold | Amex | 1.8¢ | 4x dining, 4x grocery, 3x airfare | 1x |
| Chase Sapphire | Visa | 1.5¢ | 3x dining, 2x airfare, hotel, travel; 5x on its own travel portal | 1x |
| Chase Freedom | Visa | 1.0¢ (cash) | 5% wholesale clubs and gas (rotating), 3% dining and drugstore | 1% |
| Venture X | Visa | 1.4¢ | 5x on its own travel portal | 2x |
| Apple Card | Mastercard | 1.0¢ (cash) | 3% at Nike and UberEats | 2% |
| Everyday Debit | Visa | n/a | none | 0% |

The debit card is the baseline for "earned over your default debit card" and the usual wrong card in the seeded history.

These rates are tuned so different cards win in different places:

| Store | Winner | Why |
|---|---|---|
| Trader Joe's | Amex Gold, 7.2% | 4x grocery at 1.8¢ |
| Costco | Chase Freedom, 5% | Visa only, so Amex is rejected |
| Target | Venture X, 2.8% | Coded as a discount store, so grocery bonuses do not apply |
| Delta | Amex Gold, 5.4% | 3x airfare |
| Marriott | Chase Sapphire, 3.0% | 2x hotels edges out Venture X |
| Nike | Apple Card, 3% | Merchant-specific bonus |

### Merchants

Each merchant has: `id`, `name`, `category`, `mcc`, `mcc_label`, `accepts` (networks), `channels` (store, online), `typical` spend, `coupons`, and which deals feed it belongs to.

- **In-store (mock locations):** Trader Joe's, Costco, Whole Foods, Target, Chipotle, Sweetgreen, Starbucks, Shell, CVS, Nike.
- **Meals feed:** UberEats, DoorDash, Chipotle, Sweetgreen, Starbucks.
- **Clothing feed:** Nike, Uniqlo, Lululemon, H&M.
- **Travel feed:** Delta, Marriott, Airbnb, Chase Travel portal, Capital One Travel portal.

### Coupons

Each coupon has: `code`, `kind` (percent, fixed, shipping), `value`, `min_spend`, `description`. One to three per merchant. The engine picks whichever saves the most for the given amount.

---

## 4. Rewards engine

Pure functions in `engine.py`, no network or database calls, so they are easy to test.

**Multiplier lookup, in order:** merchant-specific rate, then category rate, then base rate.

**Evaluate one card at one store:**

```
accepted  = card.network in merchant.accepts
yield %   = multiplier × cpp
points    = amount × multiplier
value $   = amount × yield % / 100
```

**Rank:** accepted cards first, then by value descending. The first accepted card is the winner.

**"Why" breakdown** returned alongside the ranking:

1. Network check, including one rejection line per rejected network.
2. MCC classification and any note (for example "not a supermarket").
3. Category and multiplier.
4. Yield: base yield, multiplier, cents per point, net yield.
5. Margin over the runner-up and over the default debit card.

**Triple Stack:**

```
coupon savings = best coupon applied to subtotal
after coupon   = subtotal − coupon savings
rewards value  = winner's value on the after-coupon amount
total value %  = (coupon savings + rewards value) / subtotal
```

Worked example: $100 at Nike with `SAVE15` leaves $85. Apple Card earns 3% of $85, which is $2.55. Total value back is $17.55, or 17.55%.

**Missed cash back:** `best card's value − used card's value`, never below zero. A card the store does not accept counts as zero.

Check against the spec: $42.50 at Trader Joe's on Amex Gold is 170 points, worth $3.06.

---

## 5. Database (Tiger Data)

One hypertable:

```sql
CREATE TABLE transactions (
  ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
  merchant      TEXT NOT NULL,
  category      TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  card_used     TEXT NOT NULL,
  best_card     TEXT NOT NULL,
  earned        NUMERIC(10,2) NOT NULL,
  best_possible NUMERIC(10,2) NOT NULL,
  missed        NUMERIC(10,2) NOT NULL,
  channel       TEXT
);
SELECT create_hypertable('transactions', 'ts');
```

Queries:

- Headline total: `SUM(missed)` over the trailing 30 days.
- Daily chart: `time_bucket('1 day', ts)` grouped sum of `missed`.
- By category: grouped sum of `missed`.
- Recent list: latest N rows.

Seeding: on first start, insert about 30 purchases spread over the past 30 days, most on the debit card, with `missed` computed by the engine so the numbers agree with the rest of the app.

---

## 6. Gemini

Two calls, both asking for JSON output:

| Call | Input | Output |
|---|---|---|
| Parse cart | Screenshot image | `merchant`, `category`, `items[] {name, qty, price}`, `subtotal` |
| Generate coupon | Store name | `code`, `discount_pct`, `description`, `category` |

- Generated coupons are cached in memory so the same store gives the same code twice.
- Generated coupons are tagged in the UI as AI-simulated.
- The model name is read from an environment variable so it can be swapped without a code change.
- On any failure the cart parser returns a sample cart flagged as a sample.

---

## 7. Frontend

A single phone-sized frame: full screen on a phone, a centred 390px device frame on desktop. Bottom tab bar with Wallet, Scan, Deals, Missed.

### Wallet screen states

```
idle ──(pick location)──► located ──(press and hold)──► scan
                             ▲                            │ 600 ms
                             │                            ▼
                          (done)                        read
                             │                            │ 1,000 ms
                             │                            ▼
                          receipt ◄──────────────────── success
```

Releasing before 1,000 ms cancels back to `located`.

| State | Cards | Other UI |
|---|---|---|
| idle | Fanned downward, full opacity | Store chip invites a location pick |
| located | Winner up, 1.05x, glowing; losers down at 40% | "Why" drawer animates in, odometer rolls |
| scan | Same | Cyan radar rings from the card's top edge |
| read | Winner shifts up 12px with a spring | Progress ring, "Reading Card..." |
| success | Same | Green checkmark, chime, vibration, transaction saved |
| receipt | Dimmed | Receipt pill slides up |

### Other screens

- **Scan:** upload area, sample-cart button, typed store and amount; then item list, three stack layers revealing in sequence, and a "which card did you use?" picker that logs the purchase.
- **Deals:** segmented control for Meals, Clothing, Travel; each deal shows store, coupon code, best card, and total stack percentage. Tapping a deal opens it in Scan.
- **Missed:** count-up headline, daily bar chart, transaction list with a missed amount on each row.

---

## 8. Build phases

### Phase 1: Data and engine
- [ ] Mock cards and merchants in `data.py`
- [ ] Ranking, Triple Stack, missed cash back in `engine.py`
- [ ] FastAPI routes for wallet, locations, recommend, stack, deals
- **Done when:** the winners table in section 3 comes back from `/api/recommend`, and the Nike example in section 4 comes back from `/api/stack`.

### Phase 2: Wallet screen
- [ ] Vite, React, Tailwind, Motion scaffold with the phone frame and tab bar
- [ ] Card component with gradients, chip, number mask
- [ ] Fan and elevate animation
- [ ] "Why" drawer and odometer
- [ ] Hold-to-pay state machine, chime, vibration, receipt
- **Done when:** picking Costco lifts Chase Freedom, shows Amex as rejected, and a full hold produces the receipt.

### Phase 3: Tiger Data and Missed
- [ ] Schema, hypertable, seed data
- [ ] Transaction and missed endpoints
- [ ] Missed screen with counter, chart, list
- [ ] Wallet payments write a transaction
- **Done when:** a payment made on the Wallet tab appears in the Missed list, and logging a debit-card purchase raises the counter.

### Phase 4: Gemini and Scan
- [ ] Cart parse and coupon generation with fallbacks
- [ ] Scan screen with the three-layer reveal
- [ ] Card-used picker that logs the purchase
- **Done when:** a real cart screenshot produces correct items, and an unknown store name returns a generated coupon.

### Phase 5: Deals and polish
- [ ] Deals feed and deal-to-Scan link
- [ ] PWA manifest and iOS meta tags
- [ ] Test on a real phone: haptics, sound, safe areas

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Gemini is slow or rate limited during the demo | Sample-cart fallback; hardcoded coupons for every demo store |
| Database unreachable at the venue | SQLite fallback (decision 1) |
| `navigator.vibrate` does nothing on iPhone Safari | Demo haptics on Android; the chime and animation still land on iPhone |
| Browsers block audio until the user interacts | The chime plays inside the press-and-hold gesture, which counts as interaction |
| Card stack does not fit on small phones | Size the stack from viewport height; let the "why" drawer scroll |
| A judge checks the maths | Engine is pure and tested against the worked examples above |

---

## 10. Demo script

1. Open on **Missed**: the counter ticks up to the amount lost in the last 30 days.
2. Switch to **Wallet**, arrive at Trader Joe's: Amex Gold lifts, the drawer explains why.
3. Change to Costco: Amex is rejected, Chase Freedom takes over.
4. Hold to pay: radar, read, chime, receipt.
5. Switch to **Scan**, upload a cart screenshot: coupon, card, and total stack reveal.
6. Type a store that is not in the dictionary: Gemini produces a coupon.
7. Finish on **Deals**: today's stacks across Meals, Clothing, Travel.
