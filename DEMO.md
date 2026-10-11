# Demo guide

How to show CreditMaxx end to end in about three minutes without anything going wrong. For setup details see [README.md](README.md); for the product story see [PROJECT.md](PROJECT.md).

Everything is simulated. Say so once, early: "cards, stores, coupons, and payments are demo data; nothing is charged."

## The story in one line

You are standing in a store, the wallet has already picked the right card and can explain why; online, it stacks a coupon on top; and the Rewards tab shows what you earned, and what picking the wrong card has been costing you.

## Before you present (5 minutes)

1. Start both servers.

   ```bash
   cd backend && uvicorn main:app --reload --port 8000
   ```

   ```bash
   cd frontend && npm run dev
   ```

2. Open http://localhost:5173/api/health. It shows `db_mode` and `gemini_configured`.
   - If the page doesn't load, the backend is not running (the app says "Could not reach the server").
   - `gemini_configured: false` is fine: Scan falls back to the sample cart and offline coupons. Skip the live screenshot upload in that case.
   - `sqlite` or `timescale` are both fine. `sqlite-fallback` means Tiger Data was unreachable at startup.
3. Open the app with a store already "detected" (see [Store detection](#store-detection-pick-one-method)) and check the Amex Gold sits on top with a green **+$3.06**.
4. Open the Rewards tab and note **Left on the table**, so you know what number to expect on stage.
5. Have a cart screenshot ready on the device if you plan to show the live Gemini upload (PNG, JPEG, or WEBP, under 5 MB).
6. Phone only: turn the ringer on and the volume up (the success chime follows the silent switch on iPhone). Vibration works on Android; iOS Safari does not support it.

Optional confidence check (about two minutes; it uses its own servers and database, so it doesn't touch yours):

```bash
cd e2e && npm install && npm test
```

### Fresh numbers

The 30 seeded purchases are written once per database and spread over the 30 days before that moment. The Rewards tab shows a trailing 30 days, so a database seeded days ago shows a smaller total, and every rehearsal purchase adds to it.

A freshly seeded database shows **$69.75 left on the table** from **30 purchases** (earned $30.80 of $100.55 possible).

To get back to that on local SQLite: stop the backend, delete `backend/demo.sqlite3`, and start it again. This also restores the six demo cards.

## Store detection: pick one method

The Wallet lifts the best card on load when the app knows which store you are in. Real GPS only matches the 10 demo stores in New York, so for a demo use the override.

| Method | When to use | How |
|---|---|---|
| `?geo=` URL (recommended) | Any device, including a phone over plain `http` | Add `?geo=lat,lng` to the URL. No permission prompt. |
| Chrome DevTools Sensors | Laptop, to show the real permission flow | DevTools → ⋮ → More tools → Sensors → Location → Other…, then reload |
| Manual picker | Fallback, always works | Tap the store chip ("Where are you shopping?") |

Ready-made URLs (swap `localhost` for the `Network:` address that `npm run dev` prints when using a phone):

| Store | URL | Winner |
|---|---|---|
| Trader Joe's | `http://localhost:5173/?geo=40.73342,-73.98788` | Amex Gold, 7.2% |
| Costco | `http://localhost:5173/?geo=40.79564,-73.93088` | Chase Freedom, 5% (Visa only) |
| Target | `http://localhost:5173/?geo=40.71453,-74.01127` | Venture X, 2.8% |
| Nike | `http://localhost:5173/?geo=40.75974,-73.97678` | Apple Card, 3% |

Bookmark the Trader Joe's URL, or add it to the phone's home screen, so the demo starts on it.

## The script

Tabs, left to right: Wallet, Scan, Deals, Rewards. Pay is the round button beside them (at the bottom of the sidebar on a laptop).

On a laptop or projector, open the URL with `?preview` added (e.g. `http://localhost:5173/?preview&geo=40.73342,-73.98788`) to show the phone app inside an iPhone frame. Double-click the frame's side button to open Pay, the way Apple Pay opens.

### 1. Wallet: the right card, already chosen (45 s)

1. Open the Trader Joe's URL. The store chip reads "Trader Joe's · $42.50", and every card shows what it earns there: Amex Gold **+$3.06** in green, the others less, Everyday Debit "No rewards".
   - Say: "I did not tap anything. It knew where I was and ranked my cards."
2. Tap the Amex Gold. Under the card: "At Trader Joe's **+$3.06 Best**, 4× grocery", and what the card earned over the last 30 days. Below that, its latest purchases.
3. Tap the "At Trader Joe's" tile. The sheet explains the pick: Amex is accepted, the store is coded as a supermarket, 4× points at 1.8¢ is a 7.2% return, and every card is ranked under it.
4. Optional: the **•••** menu → Card details lists every rate the card has and the stores where it's your best card.

### 2. Pay (30 s)

1. Tap ‹ Wallet, then **Pay**. The best card for the store is on top, "+$3.06 back · Best card here", with your other cards in a pile underneath.
2. Press and **hold** the circle for about a second. The ring fills, then a green check, a chime, coins, and "+$3.06 back". Pay closes itself.
   - Letting go early cancels. That is by design; just hold again.
3. Open the Amex Gold again: the purchase is at the top of its history, "Today · In store".
4. Optional: in Pay, tap **$42.50** and type `100`. The cards re-rank for the new total: Amex Gold earns $7.20.

### 3. Costco: the card that looks best gets rejected (30 s)

1. Tap the store chip and pick Costco.
2. Amex Gold and Apple Card say "Not accepted"; Chase Freedom earns the most (+$9.37 on $187.40).
   - Say: "Costco only takes Visa. The engine checks acceptance before it ranks anything, so it never recommends a card that would be declined."

If you have time, pick Target as well: it is coded as a discount store, not a supermarket, so the Amex Gold grocery bonus does not apply and Venture X wins at 2.8%.

### 4. Scan: coupon plus card for an online order (45 s)

1. Open Scan.
2. Either choose your cart screenshot (needs Gemini), or tap "Try a sample cart" (a $100 Nike cart, always works).
3. For the Nike cart: **$17.55** back. `SAVE15` takes $15 off, and Apple Card earns 3% on the remaining $85 ($2.55). "Why this stack" shows every coupon checked and every card ranked.
4. Tap "I used a different card", pick **Everyday Debit**, and tap "Log with Everyday Debit". It answers "Logged · $2.55 missed: Apple Card would have earned $2.55".
5. Tap **See Rewards**.

### 5. Rewards: the emotional hook (30 s)

1. The ring shows the share of possible rewards you captured, beside Earned, Saved with codes, and **Left on the table**, now $2.55 higher than what you noted before presenting (**$72.30** on a fresh seed, from 32 purchases counting the Trader Joe's payment).
2. Scroll: your best-card streak, your biggest fix ("Use Amex Gold for groceries"), the daily chart, and every purchase. The Trader Joe's payment shows a green check; the Nike order shows "$2.55 missed · Used Everyday Debit · best Apple Card".
   - Say: "Same purchases, same wallet. The only difference is which card came out."

### 6. Deals: close (15 s)

Open Deals, show the Meals, Clothing, and Travel stacks, tap one, and tap **Open in Scan** for the full breakdown.

## Extra beats if someone asks

- **Laptop or projector.** Without `?preview`, the same app adapts at 1024 px and wider: a sidebar replaces the tab bar, Wallet shows the card stack beside the open card's purchases, Scan shows the stack beside "Paid with…", Pay opens as a panel in the middle, and Rewards puts the purchases beside the totals.

- **A store we have never heard of.** In Scan, under "Or type it in", enter a store such as "Joe's Pizza" and a subtotal. It gets a simulated coupon (from Gemini, or a deterministic offline one) and a ranked wallet.
- **Adding a card.** Wallet → **+** → pick a card and type its last four digits. The rankings change to match. Remove it from the card's **•••** menu → Remove card; removals persist across restarts.
- **A different wallet.** In the browser console run `localStorage.setItem('wallet-user-id', 'judge')` and reload. That wallet starts empty; add two or three cards with **+** and the recommendations change to match. Run `localStorage.removeItem('wallet-user-id')` and reload to go back to `demo`.
- **Is the location stored?** No. The fix is sent once to match a store and then dropped.

## If something goes wrong

| Symptom | What to do |
|---|---|
| "Could not reach the server" | Restart the backend; reload the page |
| The store chip says "Where are you shopping?" on load | Check the `?geo=` value, or tap the chip and pick the store |
| "Browsers only share location over HTTPS or localhost" | Expected on a phone over `http`. Use the `?geo=` URL or the picker |
| Phone cannot open the page | Same Wi-Fi, not a guest network; allow Node.js through the Windows firewall on private networks |
| Screenshot upload returns the sample cart with a warning | Gemini was unavailable or timed out. Carry on: the stack shown is still correct for the sample cart |
| "Couldn't save your … purchase" | Tap Try again; it will not double-log |
| Pay shows "Where are you shopping?" | No store is selected: pick one. A card the store doesn't take can't pay |
| No sound | Ringer on, volume up; the first hold unlocks audio |

## What not to claim

- It does not charge a card or talk to a payment terminal. The tap-to-pay is an animation.
- Coupons are simulated, not verified offers.
- Reward rates, MCC codes, and network acceptance are realistic assumptions, not issuer data.
- Store detection recognises only the 10 demo stores.
