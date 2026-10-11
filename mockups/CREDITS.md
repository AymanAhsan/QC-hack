# Credits

Third-party designs, components, and assets used in the mockups.

- **Skiper UI** (https://skiper-ui.com) by Gurvinder Singh — free components adapted in
  `src/designs/native/skiper.tsx`: Progressive Blur (41) and Smooth caret input (106), plus the
  keyframe approach of Animated icons (99) in the tab bar. Free for personal and commercial use
  with attribution to Skiper UI.
- **Untitled UI React** (MIT, https://github.com/untitleduico/react) — credit card layout
  and contactless mark behind `CardFace` in `src/designs/native/ui.tsx`.
- **react-svg-credit-card-payment-icons** (MIT) — Visa, Amex, and Mastercard logos.
- **React Bits** (MIT + Commons Clause, https://reactbits.dev) — the Iridescence card surface,
  copied unchanged into `src/designs/native/materials/Iridescence.tsx`. Free to use inside an
  app; the component itself may not be sold or redistributed on its own.
- **react-parallax-tilt** (MIT) — tilt and glare on the opened card.
- **@squircle-js/react** (MIT) — continuous card corners.
- **Torph** (MIT) — text morph on the store chip and pay label.
- **Microsoft Fluent Emoji** (MIT, https://github.com/microsoft/fluentui-emoji) — the 3D emoji
  in `public/emoji` (receipt, ticket, fire, bullseye, party popper, coin, and others), used by
  `Emoji` in `src/designs/native/ui.tsx` and the coin shower in `coins.ts`.
- **Liquid Glass recipe** — the layered blur, sheen, and rim-light CSS in
  `src/designs/native/native.css` is hand-written. Values follow the iOS 26 tab bar
  measurements in expo-glass-tabs (MIT) and FabBar (MIT); no code was copied.
- **devices.css** (MIT, https://github.com/picturepan2/devices.css) by Yan Zhu — the iPhone 14
  mockup around the screen on desktop, copied into `src/harness/iphone-14.css` (changes listed
  in that file's header).
- **Merchant logos** — `public/logos/*.webp` are each company's own App Store icon (from the
  iTunes Search API), shrunk to 120px; Trader Joe's has no official app, so its website icon.
  The logos are trademarks of their owners and are used only to identify the merchants.
