# Credits

Third-party designs, components, and assets used in the app (`frontend/`).

- **Skiper UI** (https://skiper-ui.com) by Gurvinder Singh — free components adapted in
  `src/components/skiper.tsx`: Progressive Blur (41) and Smooth caret input (106), plus the
  keyframe approach of Animated icons (99) in the tab bar. Free for personal and commercial use
  with attribution to Skiper UI.
- **Untitled UI React** (MIT, https://github.com/untitleduico/react) — credit card layout
  behind `CardFace` in `src/components/ui.tsx`.
- **react-svg-credit-card-payment-icons** (MIT) — Visa, Amex, and Mastercard logos.
- **React Bits** (MIT + Commons Clause, https://reactbits.dev) — the Iridescence card surface,
  copied unchanged into `src/components/materials/Iridescence.tsx`. Free to use inside an
  app; the component itself may not be sold or redistributed on its own.
- **react-parallax-tilt** (MIT) — tilt and glare on the opened card.
- **@squircle-js/react** (MIT) — continuous card corners.
- **Torph** (MIT) — text morph on the store chip and pay label.
- **NumberFlow** (MIT, https://number-flow.barvian.me) — the rolling money amounts.
- **Phosphor Icons** (MIT) — interface icons.
- **Base UI** (MIT) — sheets, the Pay dialog, and the card menu.
- **Microsoft Fluent Emoji** (MIT, https://github.com/microsoft/fluentui-emoji) — the 3D emoji
  in `public/emoji` (receipt, ticket, fire, bullseye, party popper, coin, and others), used by
  `Emoji` in `src/components/ui.tsx` and the coin shower in `src/lib/coins.ts`.
- **Liquid Glass recipe** — the layered blur, sheen, and rim-light CSS in
  `src/index.css` is hand-written. Values follow the iOS 26 tab bar
  measurements in expo-glass-tabs (MIT) and FabBar (MIT); no code was copied.
- **devices.css** (MIT, https://github.com/picturepan2/devices.css) by Yan Zhu — the iPhone 14
  frame around the app in `?preview`, copied into `src/components/iphone-14.css` (changes listed
  in that file's header).
- **Card designs** — `public/card-art/*.webp` are the issuers' own card art: Amex Gold from
  americanexpress.com, Sapphire Preferred from chase.com, and Venture X, Apple Card, and
  Freedom Unlimited from Bankrate's card database. Each is trimmed to the card edge and
  enlarged 2x. Amex's sample last four is erased; Freedom Unlimited's "No annual fee" sash,
  "Unlimited" line, and sample name are erased, leaving the plain Freedom design. Chase
  publishes no debit card image, so `everyday-debit.webp` is laid out like Chase's Visa debit
  card from Chase's own logo file (chase.com), the chip and contactless marks from the Freedom
  art, and the Visa logo from react-svg-credit-card-payment-icons. The designs are trademarks
  of American Express, JPMorgan Chase, Capital One, Apple, and Visa, and are used only to
  show which card is which.
- **Merchant logos** — `public/logos/*.webp` are each company's own App Store icon (from the
  iTunes Search API), shrunk to 120px; Trader Joe's has no official app, so its website icon.
  The logos are trademarks of their owners and are used only to identify the merchants.
- **Store locations** — the NYC addresses and coordinates of the in-store merchants in
  `backend/data.py` come from OpenStreetMap (© OpenStreetMap contributors, ODbL), looked up
  with Nominatim.
