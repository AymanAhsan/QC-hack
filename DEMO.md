# Demo guide

How to show CardMax end to end in about three minutes without anything going wrong. For setup details see [README.md](README.md); for the product story see [PROJECT.md](PROJECT.md).

Everything is simulated. Say so once, early: "cards, stores, coupons, and payments are demo data; nothing is charged."

## The story in one line

You are standing in a store, the wallet has already picked the right card and can explain why; online, it stacks a coupon on top; and the Missed tab shows what picking the wrong card has been costing you.

## Before you present (5 minutes)

1. Start both servers.

   ```bash
   cd backend && uvicorn main:app --reload --port 8000
   ```

   ```bash
   cd frontend && npm run dev
   ```

2. Open the app and read the dev badge in the top-right corner. It shows `DB: <mode> · Gemini: on|off`.
   - `API offline` means the backend is not running.
   - `Gemini: off` is fine: Scan falls back to the sample cart and offline coupons. Skip the live screenshot upload in that case.
   - `DB: sqlite` or `timescale` are both fine. `sqlite-fallback` means Tiger Data was unreachable at startup.
3. Open the app with a store already "detected" (see [Store detection](#store-detection-pick-one-method)) and check the Amex Gold lifts by itself.
4. Open the Missed tab and note the current total, so you know what number to expect on stage.
5. Have a cart screenshot ready on the device if you plan to show the live Gemini upload (PNG, JPEG, or WEBP, under 5 MB).
6. Phone only: turn the ringer on and the volume up (the success chime follows the silent switch on iPhone). Vibration works on Android; iOS Safari does not support it.

Optional confidence check:

```bash
cd backend && python -m pytest
```

```bash
cd frontend && npm test
```

### Fresh numbers

The 30 seeded purchases are written once per database and spread over the 30 days before that moment. The Missed tab shows a trailing 30 days, so a database seeded days ago shows a smaller total, and every rehearsal purchase adds to it.

A freshly seeded database shows **$69.75 missed** from **30 purchases** (earned $30.80 of $100.55 possible).

To get back to that on local SQLite: stop the backend, delete `backend/demo.sqlite3`, and start it again. This also restores the six demo cards.

## Store detection: pick one method

The Wallet lifts the best card on load when the app knows which store you are in. Real GPS only matches the 10 demo stores in New York, so for a demo use the override.

| Method | When to use | How |
|---|---|---|
| `?geo=` URL (recommended) | Any device, including a phone over plain `http` | Add `?geo=lat,lng` to the URL. No permission prompt. |
| Chrome DevTools Sensors | Laptop, to show the real permission flow | DevTools → ⋮ → More tools → Sensors → Location → Other…, then reload |
| Manual picker | Fallback, always works | Tap the store chip ("Simulate arriving at a store") |

Ready-made URLs (swap `localhost` for the `Network:` address that `npm run dev` prints when using a phone):

| Store | URL | Winner |
|---|---|---|
| Trader Joe's | `http://localhost:5173/?geo=40.73342,-73.98788` | Amex Gold, 7.2% |
| Costco | `http://localhost:5173/?geo=40.79564,-73.93088` | Chase Freedom, 5% (Visa only) |
| Target | `http://localhost:5173/?geo=40.71453,-74.01127` | Venture X, 2.8% |
| Nike | `http://localhost:5173/?geo=40.75974,-73.97678` | Apple Card, 3% |

Bookmark the Trader Joe's URL, or add it to the phone's home screen, so the demo starts on it.

## The script

Tabs, left to right: Wallet, Scan, Deals, Missed.

### 1. Wallet: the right card, already chosen (60 s)

1. Open the Trader Joe's URL. The chip reads "Trader Joe's (Grocery)", the note under it says "Detected from your location", and the Amex Gold lifts and glows while the other cards dim.
   - Say: "I did not tap anything. It knew where I was and picked the card."
2. Point at the "why" drawer: Amex is accepted, the store is coded as a supermarket, 4x points at 1.8¢ is a 7.2% return, versus 2.8% for the runner-up and nothing on the debit card.
3. Press and **hold** "Hold Near Terminal" for about two seconds. Radar pulses, then "Reading Card…", then the green check, chime, and receipt: $42.50 authorized, +170 points ($3.06).
   - Letting go early cancels. That is by design; just hold again.
4. Tap Done on the receipt.

### 2. Costco: the card that looks best gets rejected (30 s)

1. Tap the store chip and pick Costco.
2. Chase Freedom lifts (5%, $9.37 on $187.40). Amex Gold and Apple Card are struck out as "rejected by Costco terminal".
   - Say: "Costco only takes Visa. The engine checks acceptance before it ranks anything, so it never recommends a card that would be declined."

If you have time, pick Target as well: it is coded as a discount store, not a supermarket, so the Amex Gold grocery bonus does not apply and Venture X wins at 2.8%.

### 3. Scan: coupon plus card for an online order (45 s)

1. Open Scan.
2. Either upload your cart screenshot (needs `Gemini: on`), or tap "Try the sample cart" (a $100 Nike cart, always works).
3. Walk the three layers for the Nike cart: `SAVE15` takes $15 off, Apple Card earns 3% on the remaining $85 ($2.55), total value back $17.55 (17.55%).
4. Under "Which card did you pay with?", pick **Everyday Debit** and tap Log purchase. It answers "missed $2.55 compared with Apple Card".
5. Tap "See missed rewards →".

### 4. Missed: the emotional hook (30 s)

1. The counter rolls up to the total, now $2.55 higher than what you noted before presenting (**$72.30** on a fresh seed, from 32 purchases counting the Trader Joe's payment).
2. Scroll: the daily chart, "Where it adds up" by category, and the purchase list with "Used" versus "Best choice". The Trader Joe's payment from step 1 shows as "Maximized"; the Nike order shows "$2.55 missed".
   - Say: "Same purchases, same wallet. The only difference is which card came out."

### 5. Deals: close (15 s)

Open Deals, show the Meals, Clothing, and Travel stacks, and tap one. It opens in Scan with the full breakdown.

## Extra beats if someone asks

- **A store we have never heard of.** In Scan, type a store such as "Joe's Pizza" and a subtotal. It gets a simulated coupon (from Gemini, or a deterministic offline one) and a ranked wallet. The coupon is labelled as simulated.
- **A different wallet.** Wallet → Manage cards → enter a new demo user ID (for example `judge`) → Switch user. That wallet starts empty; add two or three cards and the recommendations change to match. Switch back to `demo` afterwards. Prefer this over deleting cards from `demo`: deletions persist across restarts.
- **Is the location stored?** No. The fix is sent once to match a store and then dropped.

## If something goes wrong

| Symptom | What to do |
|---|---|
| Badge says `API offline` | Restart the backend; reload the page |
| No card lifts on load | Check the `?geo=` value, or tap the store chip and pick the store |
| "Browsers only share location over HTTPS or localhost" | Expected on a phone over `http`. Use the `?geo=` URL or the picker |
| Phone cannot open the page | Same Wi-Fi, not a guest network; allow Node.js through the Windows firewall on private networks |
| Screenshot upload returns the sample cart with a warning | Gemini was unavailable or timed out. Carry on: the stack shown is still correct for the sample cart |
| Receipt says the purchase could not be saved | Tap Retry on the receipt; it will not double-log |
| Hold button does nothing | No store is selected, or no card in the wallet is accepted there |
| No sound | Ringer on, volume up; the first hold unlocks audio |

## What not to claim

- It does not charge a card or talk to a payment terminal. The tap-to-pay is an animation.
- Coupons are simulated, not verified offers.
- Reward rates, MCC codes, and network acceptance are realistic assumptions, not issuer data.
- Store detection recognises only the 10 demo stores.
