# Credit Card Optimizer

A mobile web app that tells you which card in your wallet to use for every purchase, stacks the best coupon on top, and shows you how much cash back you have been leaving on the table.

It covers two situations:

- **Shopping online:** screenshot your cart, and the app reads the items, finds the best coupon, and picks the card that earns the most.
- **Shopping in a store:** the app detects where you are, lifts the winning card out of an Apple Wallet-style stack, explains why it won, and lets you "tap to pay".

This is a hackathon demo. Cards, stores, locations, coupons, and transactions are all mocked. Nothing touches a real bank, card network, or payment terminal.

---

## Features

### 1. Cart screenshot scan (online orders)

1. The user uploads a screenshot of their shopping cart.
2. Gemini reads the image and returns the merchant, the line items (name, quantity, price), and the subtotal.
3. The app runs the Triple Stack engine on that cart.
4. The user sees the best coupon, the best card from their own wallet, and the total value back.

### 2. The Triple Stack engine (core feature)

For any purchase or category, the app calculates three layers:

| Layer | What it does | Example |
|---|---|---|
| 1. Coupon / promo | Finds the best active coupon code for the store | `SAVE15`: 15% off |
| 2. Credit card | Picks the card in the wallet with the highest multiplier for that merchant | Amex Gold, 4x points on dining |
| 3. Category maximizer | Combines both into one total savings figure | "15% off + 4x points = ~19% total value back" |

### 3. Daily "Maximized Deals" feed

A dashboard grid of the best stacks available today, grouped by category:

- **🍔 Meals / Dining:** restaurants and delivery apps paired with dining-rewards cards and sign-up promos.
- **👕 Clothing / Retail:** apparel brands paired with active coupon codes and the best card for each.
- **✈️ Travel:** flight and hotel bookings mapped to travel-portal multipliers and travel cards.

### 4. "Cashback Missed" calculator

- Every simulated purchase is stored in Tiger Data.
- When a purchase is logged with a weaker card than the best one available (for example a 1% card where a 5% card was in the wallet), the app calculates the difference immediately.
- A running total is shown as a live counter: *"You've missed out on $42.50 in cash back this month by using the wrong card!"*
- The point is the emotional hook: people hate losing money, and watching the counter tick up makes the value of the app obvious.

### 5. The Intelligent Apple Wallet (in-store)

A mobile-viewport screen that mimics the Apple Wallet stacked-card interface. Copying Apple Pay's design language gives instant familiarity, avoids Apple's Secure Enclave restrictions, and lets the app animate the reasoning in a way the real wallet cannot.

```
┌────────────────────────────────────────┐
│  ● Location: Trader Joe's (Grocery)    │ ◄── Store chip (pulsing GPS)
├────────────────────────────────────────┤
│                                        │
│         [ Chase Sapphire ]             │ ◄── Runner-up (stacked behind)
│                                        │
│     ╔════════════════════════════╗     │
│     ║  AMEX GOLD                 ║     │ ◄── Winning card (lifted, glowing)
│     ║  4x Points (7.2% Yield)    ║     │
│     ╚════════════════════════════╝     │
│                                        │
├────────────────────────────────────────┤
│  WHY THIS CARD WON                     │
│  ✔ Category: Grocery (4x Multiplier)   │ ◄── "Why" breakdown drawer
│  ✔ Valuation: 1.8¢/pt = 7.2% Return    │
│  ✔ Network: Amex Accepted Here         │
├────────────────────────────────────────┤
│          (( TAP TO PAY ))              │ ◄── Simulated NFC action
└────────────────────────────────────────┘
```

Styling: `-apple-system` font, pure black (`#000000`) dark mode, iOS status bar. Cards have a metallic EMV chip, an embossed number mask (`•••• 4821`), and brand gradients (gold metallic for Amex Gold, deep navy for Sapphire).

#### Interaction 1: Auto-fan and elevate

- **Idle:** cards sit in a vertical stack fanned downward, like double-clicking the side button on an iPhone.
- **Location trigger:** when the app detects a store, a spring animation runs:
  - Losing cards slide down and dim to 40% opacity.
  - The winning card glides up, scales to 1.05x, and gets a soft neon glow in its issuer's colour.

#### Interaction 2: "Why it won" live audit

A drawer under the winning card reveals the engine's maths:

- **Network acceptance check:** a green "✔ Visa Accepted" badge, or a red strike on disqualified cards ("✖ Amex rejected by Costco terminal").
- **MCC code verification:** "✔ Classified as Supermarket (not a generic discount store)".
- **Real-yield counter:** an odometer-style rolling number, such as "1.5% Base ➔ 4x Points @ 1.8¢ = 7.2% Net Value".
- **Money left on the table:** a pill reading "+$4.32 earned over your default debit card".

#### Interaction 3: Simulated tap-to-pay

A "Hold Near Terminal" button under the card deck runs a four-beat sequence modelled on Apple Pay and Verifone terminals:

| Beat | Time | What happens |
|---|---|---|
| 1. Proximity scan | on press and hold | Concentric cyan radar pulses radiate from the top edge of the card |
| 2. Handshake | 600 ms | The card shifts up 12px, locks with a spring bounce, and shows a circular progress ring: "Reading Card..." |
| 3. Success | 1,000 ms | The ring snaps into a green checkmark, a checkout chime plays, and the phone vibrates (`navigator.vibrate([30, 50, 30])`) |
| 4. Settlement | after success | The screen darkens slightly and a receipt slides up: "✔ Approved • Amex Gold Read • $42.50 Authorized (+170 pts)" |

Completing a payment logs the purchase to the transaction history.

---

## User flows

### Online order

```
Upload cart screenshot
        │
        ▼
Gemini extracts merchant + items + subtotal
        │
        ▼
Look up merchant ──► not in dictionary? ──► Gemini generates a coupon
        │
        ▼
Layer 1: apply best coupon
Layer 2: rank wallet cards for this merchant
Layer 3: total value back
        │
        ▼
User confirms which card they actually paid with
        │
        ▼
Purchase saved to Tiger Data ──► missed-cashback counter updates
```

### In-store purchase

```
Wallet idle (cards fanned)
        │
        ▼
Mock location detected (e.g. Costco)
        │
        ▼
Engine ranks cards: network check ► MCC check ► yield
        │
        ▼
Winner lifts and glows, losers dim, "why" drawer opens
        │
        ▼
Hold to pay: scan ► read ► success ► receipt
        │
        ▼
Purchase saved to Tiger Data
```

### Browsing deals

```
Open Deals feed ► pick Meals / Clothing / Travel ► see ready-made stacks ► open one for the full breakdown
```

### Reviewing missed cash back

```
Open Missed tab ► live counter of money lost ► daily chart ► per-purchase list showing the card used vs the card that should have been used
```

---

## Scope: what is mocked

| Thing | How it is handled |
|---|---|
| Cards | Persistent per-user wallets; choose among six mock card types with realistic multipliers, point valuations, and networks |
| Stores | A hardcoded dictionary of popular merchants (Nike, Delta, UberEats, Whole Foods, and so on) with category, MCC code, and accepted networks |
| Locations | Mock store locations the user picks to simulate "arriving" somewhere |
| Coupons | Hardcoded realistic promo codes per merchant (`WELCOME10`, `SAVE15`, `FREESHIP`) |
| Unknown stores | Gemini is asked to generate a realistic promo code, discount percentage, and description for the store name |
| Transactions | Simulated spending history, seeded so the missed-cashback counter has data |
| Payment | Animation, sound, and haptics only; no real NFC |

Why hardcode: zero latency, no third-party rate limits during a live demo, and the Gemini fallback still makes it feel dynamic.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, built as a mobile-viewport PWA |
| Styling | Tailwind CSS, CSS 3D perspective for the cards |
| Animation | Motion (Framer Motion) for spring physics |
| Sound and haptics | Web Audio API and `navigator.vibrate` |
| Backend | FastAPI (Python) |
| AI | Gemini (cart screenshot parsing, coupon generation) |
| Database | Tiger Data (Postgres + TimescaleDB) |

### How the pieces fit

- **Mock data** lives in the backend: the card wallet and the merchant dictionary.
- **One rewards engine** (pure functions) does all the maths:
  - Card ranking: `yield % = multiplier × cents per point`, after removing cards whose network the store does not accept.
  - Triple Stack: best coupon, then best card, then combined value.
  - Missed cash back: value of the best card minus value of the card actually used.
- **Tiger Data** stores every purchase in a `transactions` hypertable and aggregates missed cash back over time.
- **The frontend** has four tabs: Wallet, Scan, Deals, Missed.

### API outline

| Endpoint | Purpose |
|---|---|
| `GET /api/wallet` | The user's mock cards |
| `GET /api/locations` | Mock stores for the in-store flow |
| `GET /api/recommend` | Ranked cards and the "why" breakdown for a store |
| `POST /api/cart/parse` | Cart screenshot in, parsed items and Triple Stack out |
| `POST /api/stack` | Triple Stack for a typed store name and amount |
| `GET /api/deals` | The Maximized Deals feed by category |
| `POST /api/transactions` | Log a purchase |
| `GET /api/missed` | Missed-cashback total and history |

---

## Build order

1. Mock data and the rewards engine.
2. Wallet screen with the tap-to-pay choreography (the demo centrepiece).
3. Tiger Data and the Missed counter, with seeded history.
4. Gemini cart scan and the Triple Stack screen.
5. Deals feed.

## Open decisions

- **Offline fallbacks:** whether Gemini should fall back to a sample cart, and the database to local SQLite, if keys are missing or the network drops mid-demo.
- **Stacking maths:** whether rewards are calculated on the post-coupon price (accurate, slightly lower) or simply added to the coupon percentage (matches the "15% + 4x = ~19%" example).
- **Keys needed:** a Gemini API key and a Tiger Data connection string.
