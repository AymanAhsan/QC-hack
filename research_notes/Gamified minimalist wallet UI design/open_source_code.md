# Open-source code, libraries, and kits for a playful Apple-Wallet-style mobile web UI (React 19 + Tailwind 4 + Motion 14)

Method notes for the report writer:
- Repo stats (stars, license SPDX id, last push, archived flag, open issues) were pulled from the GitHub REST API on 2026-10-10. npm versions, last-publish dates, peer deps, and weekly downloads were pulled from the npm registry and api.npmjs.org on the same day. Each row cites the GitHub or npm page those numbers come from.
- Bundle sizes marked "measured" were produced locally on 2026-10-10: each import was bundled with esbuild 0.28.2 (`--bundle --minify --format=esm`, react/react-dom external, `NODE_ENV=production`) and then compressed with `gzip -9`. They show what that import adds to a Vite build. Sizes are min / gzip. Bundlephobia only returned results for a few packages and timed out on the rest.
- The project already has `motion@^14` (latest is 14.1.0, published 2026-10-09). Its measured cost: `motion` component 44.6 KB gz; with AnimatePresence, LayoutGroup, useMotionValue, and animate, 51.5 KB gz; `LazyMotion` + `domMax` (needed for layout animations) + `m` + AnimatePresence, 46.6 KB gz. This cost is already paid, so anything built on Motion adds only its own code.

## Q1. Shortlist: which maintained libraries and kits cover pieces (1)–(8), and how do they fit React 19 + Tailwind 4 + Motion?

### Takeaway
No single kit covers everything. The cleanest stack is: Motion (already installed) for the wallet stack, layout animations, and the hold-to-pay ring; Base UI or Radix for the bottom sheet and the "..." menu; NumberFlow for counters; canvas-confetti for celebrations; use-sound for sound; ios-haptics for iOS haptics; and hand-rolled SVG for the bar chart and progress rings. Copy-paste collections (Magic UI, Motion Primitives, Cult UI) are MIT, use Tailwind 4 and `motion/react`, and are good for lifting individual components. Two licenses need care. React Bits and Animate UI are "MIT + Commons Clause", which is fine for use inside an app but bars redistributing the components. Origin UI has moved into coss.com/ui, whose repo root is AGPL-3.0; the legacy Origin UI folder is still MIT.

### Cited Findings

#### Shortlist table (pieces: 1 wallet stack, 2 detail + "..." menu, 3 hold-to-pay, 4 sheets, 5 counters, 6 confetti, 7 playful buttons/badges/rings/streaks, 8 bar chart)

| Library / kit | License | Activity (2026-10-10) | React 19 / TW4 / Motion fit | Size (measured unless noted) | Covers |
|---|---|---|---|---|---|
| Motion (`motion`) — [GitHub](https://github.com/motiondivision/motion), [npm](https://www.npmjs.com/package/motion) | MIT | v14.1.0 published 2026-10-09; repo pushed 2026-10-09; 33.9k stars; 24.4M weekly downloads | peer `react ^18 \|\| ^19` | already installed (see method notes) | 1, 2 (detail transition), 3 (progress ring via motion values), 5 (springs), 7 |
| Vaul — [GitHub](https://github.com/emilkowalski/vaul), [npm](https://www.npmjs.com/package/vaul) | MIT | **Unmaintained.** README: "This repo is unmaintained… not in the near future." Last commit 2025-10-03 ("Explain maintenance"); last release v1.1.2 on 2024-12-14; 164 open issues; still 35.0M weekly downloads | peer allows React 19 | `Drawer` 72.2 KB min / 23.1 KB gz (includes its Radix Dialog dependency) | 4 |
| Base UI (`@base-ui/react`) — [GitHub](https://github.com/mui/base-ui), [npm](https://www.npmjs.com/package/@base-ui/react) | MIT | v1.9.0 published 2026-10-09; monthly minor releases (1.5.0 May → 1.9.0 Oct 2026); 11.1k stars | peer `react ^17 \|\| ^18 \|\| ^19`; peer deps also list `date-fns ^4` and `@date-fns/tz`, but `peerDependenciesMeta` marks both optional, so Drawer and Menu don't need them. Renamed from `@base-ui-components/react` (last 1.0.0-rc.0) | Dialog 27.8 KB gz; Menu 67.7 KB gz; Drawer 43.2 KB gz; Drawer + Menu together 86.2 KB gz | 2 (Menu), 4 (Drawer, Dialog), plus Tabs, Progress, Meter, Switch, Toast |
| Radix Primitives (`radix-ui`, `@radix-ui/react-*`) — [GitHub](https://github.com/radix-ui/primitives), [npm](https://www.npmjs.com/package/radix-ui) | MIT | `radix-ui` 1.7.0 published 2026-10-09; repo pushed 2026-10-09; repo description says "Maintained by @workos" | peer allows React 19 | Dialog 14.9 KB gz; DropdownMenu 33.2 KB gz; together 34.5 KB gz; Vaul + DropdownMenu 43.0 KB gz | 2, 4 (Dialog; no native drawer) |
| React Aria Components — [GitHub](https://github.com/adobe/react-spectrum), [npm](https://www.npmjs.com/package/react-aria-components) | Apache-2.0 | v1.22.1 published 2026-10-09; repo pushed 2026-10-09 | peer allows React 19 | Modal + ModalOverlay + Dialog 21.3 KB gz; Menu + MenuTrigger + Popover 52.0 KB gz | 2, 4 |
| Headless UI — [GitHub](https://github.com/tailwindlabs/headlessui), [npm](https://www.npmjs.com/package/@headlessui/react) | MIT | v2.2.10 published 2026-04-13; repo last pushed 2026-04-13 (about 6 months idle) | peer `react ^18 \|\| ^19` | Dialog + DialogPanel + Menu set 71.1 KB gz | 2, 4 |
| shadcn/ui — [GitHub](https://github.com/shadcn-ui/ui) | MIT | pushed 2026-10-10; 125k stars; v4 app on React 19.2.3, Tailwind ^4.3.0 ([apps/v4/package.json](https://github.com/shadcn-ui/ui/blob/main/apps/v4/package.json)) | Tailwind 4 native | copy-paste (cost = underlying primitive) | 2 (DropdownMenu), 4 (Drawer, Sheet, Dialog), 7 (Progress, Badge, Tabs), 8 (Chart = Recharts) |
| NumberFlow (`@number-flow/react`) — [GitHub](https://github.com/barvian/number-flow), [npm](https://www.npmjs.com/package/@number-flow/react) | MIT | v0.6.2 published 2026-07-18; repo pushed 2026-09-20; 7.7k stars; 2.0M weekly downloads | peer `react ^18 \|\| ^19` | 18.9 KB min / 6.5 KB gz | 5 |
| canvas-confetti — [GitHub](https://github.com/catdad/canvas-confetti), [npm](https://www.npmjs.com/package/canvas-confetti) | ISC | v1.9.4 published 2025-10-25; 12.8k stars; 8.5M weekly downloads; types in `@types/canvas-confetti` | framework-free | 10.9 KB min / 4.4 KB gz (Bundlephobia agrees: 4.25 KB gz) | 6 |
| react-confetti-explosion — [GitHub](https://github.com/herrethan/react-confetti-explosion), [npm](https://www.npmjs.com/package/react-confetti-explosion) | npm says MIT; the GitHub API reports no license file | v3.0.3 published 2025-06-03; 252 stars | peer `react >=16.8` | 5.9 KB min / 2.4 KB gz (CSS-animation based) | 6 |
| react-confetti — [GitHub](https://github.com/alampros/react-confetti), [npm](https://www.npmjs.com/package/react-confetti) | MIT | v6.4.0 published 2025-03; repo pushed 2026-01 | peer allows React 19 | 3.6 KB gz | 6 (full-screen rain) |
| use-sound — [GitHub](https://github.com/joshwcomeau/use-sound), [npm](https://www.npmjs.com/package/use-sound) | MIT | v5.0.0 published 2025-02-18; repo pushed 2025-06; 60 open issues | peer `react >=16.8` | 10.9 KB gz together with howler (README: "<1kb… ~10kb loaded async") | 3, 6, 7 (sound) |
| Howler.js — [GitHub](https://github.com/goldfire/howler.js), [npm](https://www.npmjs.com/package/howler) | MIT | v2.2.4 published 2023-09-19 (no release in 3 years); repo pushed 2025-11; 420 open issues | framework-free | 37.3 KB min / 10.2 KB gz | sound |
| ios-haptics — [GitHub](https://github.com/tijnjh/ios-haptics), [npm](https://www.npmjs.com/package/ios-haptics) | MIT | v3.2.0 published 2026-09-22; reworked for iOS 26.5 in June 2026 | ref-callback API (`<button ref={hapticTrigger}>`) | 1.5 KB min / 0.8 KB gz | 3, 7 (iOS haptics on direct taps only; see Q6) |
| web-haptics — [GitHub](https://github.com/lochie/web-haptics), [npm](https://www.npmjs.com/package/web-haptics) | MIT | v0.0.6 published 2026-03-02; 2.8k stars; **open "Not working on iOS 26.5" issues (#38, #39, #40, #41)** | React/Vue/Svelte hooks | 2.6 KB gz | 3 (Android vibrate works; iOS path broken on 26.5+) |
| Recharts — [GitHub](https://github.com/recharts/recharts), [npm](https://www.npmjs.com/package/recharts) | MIT | v3.10.1 published 2026-10-03 | peer allows React 19 | BarChart + Bar + XAxis + ResponsiveContainer **101.8 KB gz** (full package 151.5 KB gz per Bundlephobia) | 8 |
| visx (`@visx/shape` + `@visx/scale`) — [GitHub](https://github.com/airbnb/visx), [npm](https://www.npmjs.com/package/@visx/shape) | MIT | `@visx/shape` 4.0.0 published 2026-06-11; repo pushed 2026-06-22 | peer `react ^18 \|\| ^19` | Bar + scaleBand + scaleLinear 15.7 KB gz | 8 |
| Magic UI — [GitHub](https://github.com/magicuidesign/magicui) | MIT | pushed 2026-10-05; 22.6k stars; site on React 19.1, Tailwind ^4.1, motion ^12 ([package.json](https://github.com/magicuidesign/magicui/blob/main/apps/www/package.json)) | copy-paste via shadcn CLI | per component | 5 (Number Ticker), 6 (Confetti, Cool Mode), 7 (Animated Circular Progress Bar, Shimmer/Pulsating/Ripple buttons, Sparkles Text) |
| Motion Primitives — [GitHub](https://github.com/ibelick/motion-primitives) | MIT | pushed 2026-09-28; 6.5k stars; package.json lists react ^18, Tailwind ^4.0.0, motion ^11.12 | components import from `motion/react` | per component | 1/2 (Morphing Dialog), 5 (Animated Number, Sliding Number), Transition Panel, Animated Background (tab highlight) |
| Cult UI — [GitHub](https://github.com/nolly-studio/cult-ui) | MIT | pushed 2026-10-01; React 19.2.4, Tailwind ^4.2.2, motion ^12.35 | `motion/react` | per component | 1/2 (Expandable Card), 4 (Family Drawer, built on Vaul), 5 (Rolling Number), 7 (Texture/Neumorph buttons, Halo Progress, Halo Badge, Direction Aware Tabs), 8 (Analytics Chart) |
| Animate UI — [GitHub](https://github.com/imskyleen/animate-ui) | **MIT + Commons Clause** (the GitHub API reports NOASSERTION) | last push **2025-12-31** (about 9 months idle) | React 19.1, Tailwind 4.1, motion 12.23 | per component | animated Radix/Base UI/Headless wrappers (Dialog, Sheet, Tabs, Progress, Switch, Dropdown); Fireworks background |
| React Bits — [GitHub](https://github.com/DavidHDev/react-bits) | **MIT + Commons Clause** | pushed 2026-10-10; 48.8k stars | React 19, Tailwind 4.0, motion 12 | per component | mostly marketing effects |
| 8bitcn — [GitHub](https://github.com/TheOrcDev/8bitcn-ui) | MIT | pushed 2026-10-08 | React 19.2, Tailwind ^4.3 | per component | 7 (retro/pixel game style) |
| RetroUI (repo now `neobrutalism/neobrutalism`) — [GitHub](https://github.com/neobrutalism/neobrutalism) | MIT | pushed 2026-08-03; `Logging-Studio/RetroUI` redirects here | React 19.2, Tailwind ^4.0, motion ^12.38 | per component | 7 (neo-brutalist chunky buttons/badges) |
| neobrutalism-components — [GitHub](https://github.com/ekmas/neobrutalism-components) | MIT | pushed 2026-09-19; 5.6k stars | React 19.0, Tailwind 4.3.3 | per component | 7 |
| NES.css — [GitHub](https://github.com/nostalgic-css/NES.css) | MIT | **last push 2024-01-17 (stale)** | plain CSS | n/a | 7 (pixel style; likely too much) |
| Sonner (toasts) — [GitHub](https://github.com/emilkowalski/sonner), [npm](https://www.npmjs.com/package/sonner) | MIT | v2.0.8 published 2026-08-09 | peer allows React 19 | 9.8 KB gz | "cash back earned" toasts (bonus) |
| lottie-react — [GitHub](https://github.com/Gamote/lottie-react), [npm](https://www.npmjs.com/package/lottie-react) | MIT | v3.1.2 published 2026-09-07 (v3 has named exports, e.g. `import { Lottie }`) | peer `react ^18.2 \|\| ^19` | `Lottie` 83.6 KB gz; `LottieLight` 53.8 KB gz (all JS, bundles lottie-web) | 6, 7 (celebration/character animation) |
| dotLottie (`@lottiefiles/dotlottie-react`) — [GitHub](https://github.com/LottieFiles/dotlottie-web), [npm](https://www.npmjs.com/package/@lottiefiles/dotlottie-react) | MIT | v0.20.0 published 2026-10-06 | peer `react ^17–19` | 14.8 KB gz JS **plus a WASM player of about 496 KB gz (1.24 MB raw)**, fetched from jsDelivr/unpkg by default | 6, 7 |
| Rive (`@rive-app/react-canvas`) — [GitHub](https://github.com/rive-app/rive-react), [npm](https://www.npmjs.com/package/@rive-app/react-canvas) | MIT | v4.36.0 published 2026-09-30 | peer allows React 19 | 68.6 KB gz JS **plus about 821 KB gz WASM (1.99 MB raw)**; `react-canvas-lite` is 60.9 KB gz JS + about 368 KB gz WASM; runtime references jsDelivr/unpkg for the WASM | 6, 7 (interactive mascots/states) |

#### Other notes
- Origin UI: `origin-space/originui` now redirects to `cosscom/coss` (10.7k stars, described as "coss.com/ui is the official design system of Cal.com"). The repo-root LICENSE is GNU AGPL v3, while `apps/origin/LICENSE.md` is MIT ("Copyright (c) 2025 coss.com"). Source: GitHub API. — [cosscom/coss](https://github.com/cosscom/coss); a third-party summary says apps/ui (coss ui) is AGPLv3 and apps/origin (legacy Origin UI) is MIT — [DeepWiki](https://deepwiki.com/cosscom/coss)
- React Bits LICENSE: "MIT + Commons Clause… You may use this Software, including for any commercial purpose, so long as you do not sell, sublicense, or redistribute the components themselves." Animate UI's LICENSE has the same structure. — [React Bits](https://github.com/DavidHDev/react-bits), [Animate UI](https://github.com/imskyleen/animate-ui)
- Aceternity UI offers free copy-paste components plus paid "Pro" blocks and templates; one listing cites a $199 lifetime price. Its marketplace licence page says items may contain components with different license terms. — [Aceternity licence](https://ui.aceternity.com/licence), [marketplace licence](https://marketplace.aceternity.com/licence)
- Skiper UI: "un-common" shadcn components installed via `npx shadcn add @skiper-ui/skiperNN`; the homepage shows only Dynamic Island as free; Premium is $129 one-time; stack is Next.js + Tailwind + Motion; no license text on the homepage. — [skiper-ui.com](https://skiper-ui.com)
- Hover.dev: React + Tailwind + Framer Motion components, mostly behind "Unlock Everything"; only "Encrypt Button" is labelled free on the homepage; "Components subject to copyright and may not be redistributed without the written consent of Hover.dev." — [hover.dev](https://www.hover.dev/)

### Inferences
- The two Motion-adjacent libraries for the sheet and menu with active monthly releases are Base UI (Drawer added in v1.2.0) and Radix. Radix Dialog + DropdownMenu (34.5 KB gz) is the lightest of the measured overlay pairings that include a menu. Base UI's Drawer is native but heavier (Drawer + Menu 86.2 KB gz).
- For a hackathon, Commons Clause licenses (React Bits, Animate UI) are not a practical blocker, because the code ships inside the app. AGPL code from coss.com/ui should be avoided unless the repo can be AGPL; the legacy Origin UI folder is MIT.
- Motion Primitives declares motion ^11.12 and react ^18 in its own package.json, but its components import `motion/react`. They should port to Motion 14 with little or no change. I did not test this.

### Gaps
- I could not get Bundlephobia numbers for most packages. All sizes above except canvas-confetti, Recharts (full), visx/shape, Sonner, Radix Dialog, Base UI (full), and motion (full) come from my own esbuild measurement, which externalizes React and does not de-duplicate shared deps across libraries.
- I did not read the full Aceternity and Skiper Terms of Service or the hover.dev License page.
- I did not run any copy-paste component against Motion 14.1 + React 19.3 in this repo.

## Q2. Apple Wallet / card-stack clones and Motion `layout` / `layoutId` techniques for "tap a card, it lifts and expands, others collapse"

### Takeaway
There is no maintained, licensed, web-based Apple Wallet clone worth forking. The GitHub hits are tiny, stale, or React Native. The practical path is to hand-build it with Motion's `layout` prop: each card is absolutely offset in a stack, a selected-card state changes the offsets, and `layout` animates the change, with `layoutId` and `AnimatePresence` for the card-to-detail transition. Motion's official docs show the exact pattern. Motion's App Store tutorial, the closest walkthrough, is paywalled (Motion+).

### Cited Findings
- Motion docs: `layout` animates any size or position change caused by a React render. `layoutId` "connects two elements for shared transitions… If both are mounted, they crossfade." `AnimatePresence` lets a shared element animate back. `LayoutGroup` is needed when siblings that don't re-render together affect each other's layout. `layout="position"` animates position only. `layoutScroll` is for scroll containers and `layoutRoot` for fixed containers. — [Motion layout animations](https://motion.dev/docs/react-layout-animations)
- A card expanding into a detail view, following the pattern in the docs: `{!isOpen && <motion.div layoutId="card" …/>} <AnimatePresence>{isOpen && <motion.div layoutId="card" />}</AnimatePresence>`. When closing, the transition on the element being animated *to* is used. — [Motion layout animations](https://motion.dev/docs/react-layout-animations)
- Distortion and gotchas: layout animations use `scale`, so children need `layout` too. `borderRadius` and `boxShadow` are corrected automatically only when set via `style` or animation props. `display:inline` won't animate. SVG isn't supported for layout. Scrollbars appearing can trigger unwanted layout animations (use `scrollbar-gutter: stable`). Borders can look stretched. — [Motion layout animations](https://motion.dev/docs/react-layout-animations)
- Motion's "react app store" tutorial (layoutId + AnimatePresence for card-to-detail) and its "card stack" tutorial (drag-to-swipe with useMotionValue/useTransform) exist but are Motion+ (paid). The card-stack one is a swipe deck, not a wallet. — [App Store tutorial](https://motion.dev/tutorials/react-app-store), [Card stack tutorial](https://motion.dev/tutorials/react-card-stack)
- Framer Marketplace "Wallet Card": "single click on the wallet smoothly expands the cards into full view". It is a paid Framer component, so it is a visual reference only. — [Framer marketplace](https://www.framer.com/marketplace/components/wallet-card/)
- Aceternity "Card Stack" cycles cards with offset and scale (Framer Motion). It has no tap-to-expand and uses no layoutId. — [Aceternity Card Stack](https://aceternity.com/components/card-stack)
- Cult UI "Expandable Card" (imports `motion/react` and `react-use-measure`) and Motion Primitives "Morphing Dialog" (shared-layout card→dialog) are MIT copy-paste starting points for the card-to-detail morph. — [Cult UI docs](https://www.cult-ui.com/docs), [Motion Primitives docs](https://motion-primitives.com/docs), [Cult UI repo](https://github.com/nolly-studio/cult-ui), [Motion Primitives repo](https://github.com/ibelick/motion-primitives)
- Skiper UI "skiper16 — Card stack scroll" (scroll-driven stacked cards; free or paid status not confirmed). — [skiper16](https://skiper-ui.com/v1/skiper16)
- GitHub web examples, all small:
  - `dodycode/cards-stack-react`: Framer Motion stack slider, 3 stars, no license, last push 2023-08, demo at cards-stack-react.pages.dev — [GitHub](https://github.com/dodycode/cards-stack-react)
  - `haideralsh/framer-motion-expanding-cards`: card expansion demo, 0 stars, no license, 2023-04 — [GitHub](https://github.com/haideralsh/framer-motion-expanding-cards)
  - `elainegasca/react-apple-wallet`: MIT, 2019, depends only on prop-types (pre-hooks era) — [GitHub](https://github.com/elainegasca/react-apple-wallet)
  - `okproject/react-cardstack`: MIT, 2016 — [GitHub](https://github.com/okproject/react-cardstack)
  - `a2rp/framer-motion-demos`: MIT, pushed 2026-09, gallery of Framer Motion patterns (Vite) — [GitHub](https://github.com/a2rp/framer-motion-demos)
- Technique reference only (React Native):
  - `tarikfp/react-native-apple-wallet-animation`: MIT, 2024-04, with an accompanying article — [GitHub](https://github.com/tarikfp/react-native-apple-wallet-animation), [article](https://levelup.gitconnected.com/apple-wallet-animation-in-react-native-2faaf4dd10a4)
  - `bibin-jaimon/rn-wallet`: Apple Wallet deck clone with Reanimated, no license — [GitHub](https://github.com/bibin-jaimon/rn-wallet)
  - Flutter: `mejdi14/flutter_apple_wallet_animation` (2021) — [GitHub](https://github.com/mejdi14/flutter_apple_wallet_animation)
- Pure-CSS reference: an "expandable wallet payment card" that toggles collapse/expand with a hidden checkbox and `:has()`, without ARIA bindings (Safari 15.4+). — [freefrontend](https://freefrontend.com/code/expandable-css-wallet-payment-card-2026-02-24/)
- CodePen stacked/expanding card demos (generic, not wallet-specific): [NikunjPoshiya](https://codepen.io/NikunjPoshiya/pen/mmLdQm), [nailaahmad](https://codepen.io/nailaahmad/pen/LGRxWJ)
- Swiper Studio "Credit Cards Slider with Vertical Cards Effect" is a template for a vertical card deck. — [Swiper Studio](https://studio.swiperjs.com/templates/credit-cards)

### Inferences
- Recommended implementation: render cards in a `LayoutGroup`. Collapsed, each card is `position:absolute` with `top = i * peek` (about 48–64 px). When one is selected, it moves to `top=0`, the others get `top = containerHeight - k*8` (tucked at the bottom, as in Apple Wallet), and every card has `layout` plus a spring. The detail content (transaction list) mounts under the selected card with `AnimatePresence`. This needs only Motion, which is already installed. Use `layoutId` only if the detail view is a separate route or portal.
- Keep the card's border-radius and shadow in `style` (not Tailwind classes alone) so Motion's scale correction keeps corners crisp during the morph, as the docs advise.

### Gaps
- I found no free, maintained, open-source web tutorial specifically for an Apple Wallet stack with Motion. The best official walkthrough (App Store) is paywalled.
- I did not open or run the small GitHub demos, so I can't speak to their code quality.
- The Skiper "Card stack scroll" license and free/paid status are unconfirmed.

## Q3. Hold-to-confirm ("hold to pay") button examples with progress ring, checkmark, sound, haptics

### Takeaway
The best free references are Emil Kowalski's "hold to delete" article (pure CSS clip-path: 2 s linear fill while `:active`, 200 ms ease-out snap back) and Motion's hold-to-confirm pattern: a `useMotionValue` progress value animated with `animate()`, with other values (ring, fill, scale) derived through `useTransform`. Motion's full tutorial is paywalled, but the hooks it uses are free. For a circular ring, draw an SVG `<circle>` and bind `pathLength` (or `strokeDashoffset`) to the progress value. On completion, swap to a checkmark path with `pathLength` 0→1. Fire a sound with use-sound. iOS haptics on the web now fire only on a direct tap (see Q6).

### Cited Findings
- Emil Kowalski, "Building a hold to delete component": a duplicate `aria-hidden` overlay sits over the button and is revealed via `clip-path: inset(0px 100% 0px 0px)` → `inset(0 0 0 0)` on `.button:active`, with `transition: clip-path 2s linear`. The base rule's `transition: clip-path 200ms ease-out` makes release snap back. `.button:active { transform: scale(0.97) }` with a 160 ms ease-out. A React playground with full code is included. No keyboard or reduced-motion handling is covered. — [emilkowal.ski](https://emilkowal.ski/ui/building-a-hold-to-delete-component)
- Motion "Hold to confirm" (React) tutorial: uses `useMotionValue` to track hold progress, `useTransform` to link animated values to that progress, and `animate` to animate it. Beyond the intro, it is Motion+ only (one-time purchase), and the free part is a skeleton. There is also a vanilla JS version. — [Motion React tutorial](https://motion.dev/tutorials/react-hold-to-confirm), [Motion JS tutorial](https://motion.dev/tutorials/js-hold-to-confirm)
- 21st.dev components: a "Hold to confirm" published by @motiondotdev; a "Hold to Confirm Button" that fills a circular ring while held, springs back if released early, and morphs into a success checkmark; a "Hold to delete Button" (license listed as unknown); and Kokonut's "Hold and Release Button". — [Motion on 21st.dev](https://21st.dev/@motiondotdev/components/motion-hold-to-confirm.md), [ring + checkmark](https://21st.dev/@arihantcodes_1f7b8c4d/components/hold-to-confirm.md), [hold to delete](https://21st.dev/@rafa-porto/components/hold-to-delete-button.md), [hold and release](https://21st.dev/@kokonutd/components/hold-and-release-button.md)
- Jakub Krehel's "Clip path buttons" use clip-path for a hold effect with contextual icons. — [jakub.kr](https://jakub.kr/work/clip-path-buttons)
- A Zenn (Japanese) article with React code reveals the overlay over 2 s on mousedown, cancels on mouseup, and calls `onDelete` only if the hold completes. — [zenn.dev](https://zenn.dev/genai/articles/delete-button-ux)
- `clicknhold`: a React hook for long press with progress tracking (mouse, touch, keyboard). — [README](https://unpkg.com/clicknhold@1.1.0/README.md)
- Ring technique: SVG drawing maps to `pathLength` 0→1, and circular progress maps to a `strokeDashoffset` tween. — [motion-advanced skill summary](https://tessl.io/registry/skills/github/affaan-m/ECC/motion-advanced) (secondary source)
- Magic UI "Animated Circular Progress Bar" is a copy-paste ring (Tailwind/CSS only; its file imports only `cn`). — [Magic UI components](https://magicui.design/docs/components), [repo](https://github.com/magicuidesign/magicui)
- Sound: use-sound supports `interrupt`, `sprite` (several effects in one file), and `playbackRate`. It lazy-loads Howler (about 1 KB gz up front, about 9 KB gz async). TypeScript users install `@types/howler`. — [use-sound README](https://github.com/joshwcomeau/use-sound)

### Inferences
- Suggested build: a `<motion.button>` with pointer-down starting `animate(progress, 1, { duration: 1.2, ease: "linear" })` and pointer-up or cancel running `animate(progress, 0, { type: "spring" })`. An SVG ring has `style={{ pathLength: progress }}`. On complete, play the sound, fire confetti, and swap to a checkmark. Add keyboard support (Space/Enter hold) and a reduced-motion fallback, since Emil's CSS-only version covers neither.
- Because iOS 26.5 only produces haptics from a real tap on a hidden switch, a haptic at hold *completion* (mid-press) is likely impossible on iOS. A haptic on press-start or release is achievable with ios-haptics' overlay. This is an inference from the library's design; I did not test it on a device.

### Gaps
- The full Motion+ tutorial code (durations, effects) is not public.
- The licenses of the 21st.dev components are unknown or unverified.

## Q4. Bottom sheets, overlays, and the "..." menu: Vaul vs Base UI vs Radix vs React Aria vs Headless UI (React 19 / Tailwind 4 / maintenance, 2026)

### Takeaway
Vaul still works with React 19 (its peer deps allow it), but it is officially unmaintained. Its README says so, the last release was December 2024, and it has 164 open issues. shadcn/ui now ships two drawer variants: the Radix base still wraps Vaul, while the Base UI base uses Base UI's own `Drawer`, which has snap-point support in shadcn's wrapper. All of Base UI, Radix, and React Aria Components shipped releases on 2026-10-09. Headless UI's last release was in April 2026.

### Cited Findings
- Vaul README: "This repo is unmaintained. I might come back to it at some point, but not in the near future. This was and always will be a hobby project and I simply don't have the time or will to work on it right now." Latest commit 2025-10-03 ("Explain maintenance"), release v1.1.2 on 2024-12-14, peer deps `react ^16.8 … ^19.0.0`, 8.6k stars, 35.0M weekly downloads. — [Vaul](https://github.com/emilkowalski/vaul), [npm](https://www.npmjs.com/package/vaul)
- shadcn/ui source: `apps/v4/registry/bases/radix/ui/drawer.tsx` and `new-york-v4/ui/drawer.tsx` import `Drawer` from `"vaul"`. `apps/v4/registry/bases/base/ui/drawer.tsx` imports `Drawer` from `"@base-ui/react/drawer"` and has a `hasSnapPoints` context. — [shadcn-ui/ui](https://github.com/shadcn-ui/ui), [shadcn Base drawer docs](https://ui.shadcn.com/docs/components/base/drawer)
- shadcn's docs include a migration note: replace the `vaul` dependency with `@base-ui/react`, rename `direction` → `swipeDirection` and `asChild` → `render`. — [shadcn aria drawer docs](https://ui.shadcn.com/docs/components/aria/drawer) (seen via search snippet)
- Base UI changelog v1.2.0: "Create new Drawer / Sheet component (#3680)". v1.9.0 (2026-10-09) includes Drawer fixes ("Avoid touch event overhead while the drawer is closed", "Avoid retaining unmounted drawers in `<Drawer.Provider>`"). Exports include drawer, dialog, alert-dialog, menu, context-menu, tabs, progress, meter, switch, toast, toggle-group. The `date-fns` and `@date-fns/tz` peers are marked optional in `peerDependenciesMeta`. — [Base UI](https://github.com/mui/base-ui), [npm](https://www.npmjs.com/package/@base-ui/react)
- Community port `vaul-base` ("a port of Vaul to Base UI") exists. Its maintenance is unverified. — [vaul-base README](https://cdn.jsdelivr.net/npm/vaul-base@1.0.0/README.md)
- Cult UI's "Family Drawer" (a Family-wallet-style multi-step drawer) imports `Drawer` from `"vaul"` and `AnimatePresence, motion` from `"motion/react"`, so it inherits Vaul's maintenance status. — [cult-ui family-drawer.tsx](https://github.com/nolly-studio/cult-ui/blob/main/apps/www/registry/default/ui/family-drawer.tsx)
- Radix Primitives repo description: "Maintained by @workos"; `radix-ui` 1.7.0 and `@radix-ui/react-dialog` 1.2.0 published 2026-10-09. — [Radix](https://github.com/radix-ui/primitives), [npm](https://www.npmjs.com/package/radix-ui)
- React Aria Components 1.22.1 published 2026-10-09 (Apache-2.0). — [npm](https://www.npmjs.com/package/react-aria-components)
- Headless UI 2.2.10 published 2026-04-13. The repo has had no pushes since then. — [Headless UI](https://github.com/tailwindlabs/headlessui)
- Measured sizes (gz): Vaul 23.1 KB; Base UI Drawer 43.2 KB; Radix Dialog 14.9 KB; Radix Dialog + DropdownMenu 34.5 KB; Vaul + Radix DropdownMenu 43.0 KB; Base UI Drawer + Menu 86.2 KB; RAC Modal set 21.3 KB; RAC Menu set 52.0 KB; Headless Dialog + Menu 71.1 KB. — measured locally; packages: [vaul](https://www.npmjs.com/package/vaul), [@base-ui/react](https://www.npmjs.com/package/@base-ui/react), [@radix-ui/react-dialog](https://www.npmjs.com/package/@radix-ui/react-dialog), [react-aria-components](https://www.npmjs.com/package/react-aria-components), [@headlessui/react](https://www.npmjs.com/package/@headlessui/react)

### Inferences
- For CardMax there are two good options. (a) Base UI Drawer + Base UI Menu: one maintained dependency with native swipe and snap points, the heavier choice. (b) Radix DropdownMenu plus a hand-rolled Motion bottom sheet (`motion.div` with `drag="y"`, `dragConstraints`, and an `onDragEnd` velocity check) on top of Radix Dialog for focus trap and scroll lock: lighter, but more of our own code. Vaul is acceptable for a two-day hackathon because it works today, but it's a dead end for anything longer-lived.
- Headless UI is the least attractive: a heavier measured bundle, slower release cadence, and no drawer primitive.

### Gaps
- I didn't verify on-device how Base UI Drawer swipe feels on iOS Safari compared with Vaul.

## Q5. Copy-paste component collections (shadcn/ui, Magic UI, Aceternity, Motion Primitives, Animate UI, Cult UI, Origin UI, React Bits, Hover.dev, Skiper UI): relevant pieces and licenses

### Takeaway
Magic UI, Motion Primitives, and Cult UI are the most useful MIT sources. Magic UI has Number Ticker, Confetti, Cool Mode, a circular progress ring, and playful buttons. Motion Primitives has Animated/Sliding Number, Morphing Dialog, and Transition Panel. Cult UI has Expandable Card, Family Drawer, Rolling Number, Texture/Neumorph buttons, Dynamic Island, and Direction Aware Tabs. None ships a ready hold-to-confirm button. Aceternity, Hover.dev, and Skiper are freemium with restrictive or unpublished terms.

### Cited Findings
- Magic UI (79 components) includes Number Ticker, Confetti, Cool Mode, Animated Circular Progress Bar, Animated List, Dock, Ripple/Ripple Button, Shimmer/Shiny/Pulsating/Rainbow/Interactive Hover buttons, Sparkles Text, iPhone and Android mockups. It has no card stack, hold button, tabs, or bar chart. — [Magic UI components](https://magicui.design/docs/components)
- Magic UI internals: `confetti.tsx` wraps `canvas-confetti`; `number-ticker.tsx` uses `useInView`, `useMotionValue`, `useSpring` from `"motion/react"`. MIT; 22.6k stars; pushed 2026-10-05. — [magicui repo](https://github.com/magicuidesign/magicui)
- Motion Primitives components: Accordion, Animated Background, Animated Group, Border Trail, Carousel, Dialog, Disclosure, In View, Infinite Slider, Transition Panel, text effects, **Animated Number, Sliding Number**, Dock, Glow Effect, Spotlight, Tilt, Toolbar Dynamic/Expandable, Magnetic, **Morphing Dialog, Morphing Popover**, Progressive Blur. `animated-number.tsx` imports `motion, useSpring, useTransform` from `'motion/react'`. MIT. — [Motion Primitives docs](https://motion-primitives.com/docs), [repo](https://github.com/ibelick/motion-primitives)
- Cult UI includes Dynamic Island, Halo Progress/Badge/Toast, Direction Aware Tabs, Popover, Floating Panel, **Family Drawer**, Side Panel, Morph Surface, Expandable Screen, Texture/Neumorph/Metal/Organic buttons, **Expandable Card**, Shift Card, **Rolling Number**, Analytics Chart, Timer, and Apple iPhone 17 Pro Max mockup. It has no hold-to-confirm and no confetti. MIT. — [Cult UI docs](https://www.cult-ui.com/docs), [repo](https://github.com/nolly-studio/cult-ui)
- Animate UI: animated wrappers around Radix (Dialog, Sheet, Dropdown Menu, Progress, Switch, Tabs, …), Base UI (Dialog, Menu, Progress, Tabs, …), and Headless UI (Dialog, Switch, Tabs), plus Ripple/Liquid/Flip buttons, a Fireworks background, and community components such as "Playful Todolist" and "Notification List". License: MIT + Commons Clause. Last push 2025-12-31. — [Animate UI components](https://animate-ui.com/docs/components), [repo](https://github.com/imskyleen/animate-ui)
- Aceternity: free copy-paste components plus paid Pro; it has a Card Stack (cycling, not a wallet). — [Aceternity licence](https://ui.aceternity.com/licence), [Card Stack](https://aceternity.com/components/card-stack)
- Skiper UI: 106+ single-file shadcn-registry components; mostly Premium ($129); Dynamic Island free. — [skiper-ui.com](https://skiper-ui.com)
- Hover.dev: mostly paid; no redistribution without written consent. — [hover.dev](https://www.hover.dev/)
- Origin UI is now coss.com/ui (AGPL at repo root; legacy Origin UI folder MIT). — [cosscom/coss](https://github.com/cosscom/coss)
- React Bits: 48.8k stars, MIT + Commons Clause, mainly landing-page effects. — [React Bits](https://github.com/DavidHDev/react-bits)

### Inferences
- The highest-value lifts are: Magic UI Confetti (canvas-confetti wrapper) and Number Ticker (or NumberFlow directly); Motion Primitives Morphing Dialog as reference for card→detail; Cult UI Expandable Card and Texture Button as visual references for chunky tactile buttons; and Magic UI Animated Circular Progress Bar for ring styling.
- The hold-to-pay button has to be custom (Q3).

### Gaps
- I didn't check whether Animate UI's "Counting Number" or "Sliding Number" text primitives still exist. The components page I fetched did not list them.

## Q6. Effects: confetti, animated numbers, sound, and iOS Safari haptics (verified status, October 2026)

### Takeaway
canvas-confetti (4.4 KB gz, emoji shapes, `disableForReducedMotion`) and NumberFlow (6.5 KB gz, Intl-formatted currency, respects reduced motion by default) are the clear picks. `navigator.vibrate` is still unsupported in Safari and iOS. The `<input type="checkbox" switch>` haptic trick was patched in iOS 26.5 for programmatic `.click()` calls. ios-haptics v3.1+ works around this with a transparent overlay so the user's real tap toggles the switch. web-haptics has open "not working on iOS 26.5" issues.

### Cited Findings
- canvas-confetti options include `shapes` (`square`, `circle`, `star`), `confetti.shapeFromPath`, and `confetti.shapeFromText` ("render emoji confetti!"). `disableForReducedMotion` (default false) "disables confetti entirely for users that prefer reduced motion." — [canvas-confetti README](https://github.com/catdad/canvas-confetti)
- react-confetti-explosion is a "lightweight css-animation based confetti exploder for React" (2.4 KB gz measured). — [GitHub](https://github.com/herrethan/react-confetti-explosion)
- NumberFlow: formats via `Intl.NumberFormatOptions` (currency, compact, percent). `trend` controls digit direction. `respectMotionPreference` defaults to true. `NumberFlowGroup` syncs related numbers. It is built on a custom element with shadow DOM (`::part` styling may flash unstyled in browsers without Declarative Shadow DOM). It does not support scientific notation, non-Latin digits, or RTL. `useCanAnimate` reports feature support. — [NumberFlow docs](https://number-flow.barvian.me/)
- NumberFlow's dependency footprint: `@number-flow/react` depends only on `number-flow` and `esm-env`. MIT. v0.6.2 (2026-07-18). — [npm](https://www.npmjs.com/package/@number-flow/react)
- Other animated-number options: Magic UI Number Ticker (motion `useSpring`), Motion Primitives Animated Number / Sliding Number, Cult UI Rolling Number. — [Magic UI](https://github.com/magicuidesign/magicui), [Motion Primitives](https://motion-primitives.com/docs), [Cult UI](https://www.cult-ui.com/docs)
- `navigator.vibrate`: MDN browser-compat-data lists Safari `version_added: false`, with Safari iOS mirroring that. Chrome Android has supported it since 32 but requires a user gesture since Chrome 60. Firefox Android has disabled vibration since v79 (returns true but doesn't vibrate). — [MDN BCD Navigator.json](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json)
- ios-haptics README: uses `<input type="checkbox" switch />` ("introduced in safari 17.4"). `hapticTrigger` places a transparent overlay on your element so "when the user taps the element, the label forwards the tap to the switch as a trusted click". API: `<button ref={hapticTrigger}>`. A live demo is on CodePen. — [ios-haptics](https://github.com/tijnjh/ios-haptics), [CodePen demo](https://codepen.io/tijnjh/pen/KwpgPqB)
- ios-haptics issue #8 "Can't Believe Apple 'Patched' This" (2026-06-04). The maintainer replied "new version, while being less flexible, works!" (2026-06-25). The commit history shows an `ios-26-5` branch merged in June 2026 (v3.1.0/3.1.1) and a September 2026 fix (v3.2.0) so scroll still works when a gesture starts on a haptic element. — [issue #8](https://github.com/tijnjh/ios-haptics/issues/8), [commits](https://github.com/tijnjh/ios-haptics/commits/main)
- web-haptics (Lochie Axon, haptics.lochie.me): preset API (`trigger("success")`, patterns, intensity), React hook `useWebHaptics`. Open issues: #38 "Not working on iOS 26.5" (2026-05-15), #39 "Not working on IOS", #41 "Investigate iOS 26.5+ direct-tap switch fallback instead of programmatic .click()". Its shipped code still appends a hidden switch and label to `document.body`. — [web-haptics](https://github.com/lochie/web-haptics), [issues](https://github.com/lochie/web-haptics/issues)
- `m1ckc3s/project-fathom`: "Tiny React sandbox proving you can fire native iOS haptics from a plain web page… works after the iOS 26.5 patch" (90 stars, no license). — [project-fathom](https://github.com/m1ckc3s/project-fathom)
- use-sound wraps Howler.js. It is about 1 KB gz plus about 9 KB gz lazy-loaded and supports sprites and `interrupt`. Howler's last npm release was 2.2.4 on 2023-09-19. — [use-sound](https://github.com/joshwcomeau/use-sound), [howler npm](https://www.npmjs.com/package/howler)

### Inferences
- For CardMax: use `ios-haptics` on the hold-to-pay button and the chunky buttons (haptic on tap), and call `navigator.vibrate` where available (Android Chrome) for the success pattern. On iOS, expect no haptic at hold completion unless it coincides with the finger lift.
- Howler's three-year release gap is not a practical risk for playing a few short sound effects. For zero dependencies, a plain `new Audio()` or Web Audio call is a viable alternative. iOS needs the first play to come from a user gesture, and the hold-to-pay press provides that.

### Gaps
- I couldn't find an Apple release note or WebKit bug confirming the iOS 26.5 change. The evidence is developer reports in two independent repos (ios-haptics #8, web-haptics #38/#41) plus project-fathom's description.
- I didn't test on-device whether the ios-haptics overlay fires on touch-down or on release, or how it interacts with a long press.
- I found no source on NumberFlow-specific iOS Safari issues; its docs don't mention Safari.

## Q7. Playful / gamified kits and recipes (Duolingo-style 3D buttons, neo-brutalism, pixel kits, Figma kits, Rive/Lottie)

### Takeaway
The Duolingo look is easy to hand-roll: a solid darker "edge" under the face (box-shadow or a separate layer), with the face moving down on `:active`. Josh Comeau's 3D button gives the best-performing version (animate `transform` only, 34 ms press, springy 250 ms hover, 600 ms release). The maintained, MIT, Tailwind 4 neo-brutalism and retro kits are neobrutalism-components, RetroUI, and 8bitcn. NES.css is stale. For mascots or celebration animations, dotLottie and Rive cost roughly 0.4–0.8 MB of WASM each, while lottie-react is about 54–84 KB gz of JS.

### Cited Findings
- Josh Comeau "3D button": `<button class="pushable">` with `.shadow`, `.edge`, `.front` spans. Only `transform` and `filter` animate ("box-shadow or border… super expensive"). `.front` sits at `translateY(-4px)` at rest, `-6px` on hover, and `-2px` when active. Release takes 600 ms `cubic-bezier(0.3, 0.7, 0.4, 1)`; hover 250 ms `cubic-bezier(0.3, 0.7, 0.4, 1.5)`; press 34 ms. Focus uses `:focus:not(:focus-visible)` with `outline-offset: 4px`. On mobile, `-webkit-tap-highlight-color: transparent` and `user-select: none`. — [joshwcomeau.com](https://www.joshwcomeau.com/animation/3d-button/)
- Duolingo-inspired design-system description: a chunky 4 px bottom shadow on interactive elements. The primary button has a 4 px darker-green bottom border and drops 4 px on press. — [open-design.ai](https://open-design.ai/plugins/design-system-duolingo/) (third-party aggregator; low authority)
- neobrutalism-components: MIT, 5.6k stars, pushed 2026-09-19, React 19.0, Tailwind 4.3.3. — [GitHub](https://github.com/ekmas/neobrutalism-components)
- RetroUI (now `neobrutalism/neobrutalism`): "A NeoBrutalism styled React + TailwindCSS UI library". MIT. Pushed 2026-08-03. React 19.2, Tailwind ^4.0.14, motion ^12.38. — [GitHub](https://github.com/neobrutalism/neobrutalism)
- 8bitcn: "retro-designed, accessible components and a code distribution platform", MIT, pushed 2026-10-08, React 19.2, Tailwind ^4.3. — [GitHub](https://github.com/TheOrcDev/8bitcn-ui)
- NES.css: MIT, 21.8k stars, last push 2024-01-17. — [GitHub](https://github.com/nostalgic-css/NES.css)
- Rive React runtime: MIT, v4.36.0 (2026-09-30). The runtime fetches WASM from jsDelivr/unpkg (URLs present in `@rive-app/canvas/rive.js`). WASM is 1.99 MB raw / about 821 KB gz (canvas) or 901 KB raw / about 368 KB gz (canvas-lite). — [rive-react](https://github.com/rive-app/rive-react), [npm](https://www.npmjs.com/package/@rive-app/react-canvas)
- dotLottie React: JS 14.8 KB gz, plus `dotlottie-player.wasm` at 1.24 MB raw / about 496 KB gz, loaded from `cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@…` with an unpkg fallback. — [dotlottie-web](https://github.com/LottieFiles/dotlottie-web), [npm](https://www.npmjs.com/package/@lottiefiles/dotlottie-react)
- lottie-react v3: depends on `lottie-web ^5.13`; named exports (`Lottie`, `LottieLight`, `LottieSvg`, `useLottie`, `lottieInView`, `lottieScrollScrub`, …). Measured `Lottie` at 83.6 KB gz and `LottieLight` at 53.8 KB gz. — [lottie-react](https://github.com/Gamote/lottie-react), [npm](https://www.npmjs.com/package/lottie-react)
- Figma kits: I found no kit that combines gamification with finance. Free community "Mini Finance" has 20 mobile finance screens. Gamified kits are language-learning focused (Elingo, paid, "gamification concepts like Duolingo", 150 screens; Wordino on Creative Market). — [Mini Finance](https://forum.figma.com/showcase-your-work-14/introducing-mini-finance-ui-kit-for-figma-39716), [Elingo](https://munirsr.gumroad.com/l/elingo), [Wordino](https://creativemarket.com/jonnie-sami-xo/292051493-Learning-Language-App-UI-Kit)

### Inferences
- A Tailwind 4 recipe that follows Comeau's advice: an outer `<button>` with a `bg-[edge]` layer and an inner face with `-translate-y-1 active:-translate-y-0.5 transition-transform`. It is cheaper to animate than toggling `shadow-[0_4px_0_…]`, which repaints.
- Badges, streak flames, and progress rings are simple enough to hand-build with SVG and Motion. Mascot or celebration animation via Rive or dotLottie adds about 0.4–0.8 MB of WASM from a third-party CDN. For a PWA that should work offline, the WASM must be self-hosted or precached. canvas-confetti with emoji shapes gives a celebration for 4.4 KB gz.

### Gaps
- I found no well-maintained, open-source "gamified fintech" Tailwind kit. The gamified pieces would come from combining neo-brutalist kits with custom components.
- I didn't verify the size of the `.riv` and `.lottie` asset files themselves.

## Q8. A single small bar chart: Recharts vs visx vs plain SVG

### Takeaway
For one small bar chart, plain SVG with Motion (animate `scaleY` or height per bar) costs nothing extra. visx is the lightest library option at 15.7 KB gz. Recharts, used by shadcn's Chart, costs about 102 KB gz even for a tree-shaken BarChart.

### Cited Findings
- Recharts 3.10.1 (MIT, published 2026-10-03): BarChart + Bar + XAxis + ResponsiveContainer measured 327 KB min / 101.8 KB gz. Bundlephobia full package: 566 KB min / 151.5 KB gz. — [npm](https://www.npmjs.com/package/recharts), [Bundlephobia](https://bundlephobia.com/package/recharts@3.10.1)
- shadcn/ui's `chart.tsx` imports `* as RechartsPrimitive from "recharts"`. — [shadcn chart.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/chart.tsx)
- visx `@visx/shape` 4.0.0 (MIT, published 2026-06-11; peer `react ^18 || ^19`): Bar + `@visx/scale` scaleBand/scaleLinear measured 43.5 KB min / 15.7 KB gz. Bundlephobia full `@visx/shape`: 10.7 KB gz. — [npm](https://www.npmjs.com/package/@visx/shape), [visx](https://github.com/airbnb/visx)
- Cult UI includes an "Analytics Chart" component. — [Cult UI docs](https://www.cult-ui.com/docs)

### Inferences
- Plain SVG is the right call: a handful of `<motion.rect>` (or `motion.div` bars in a flex row) with `initial={{ scaleY: 0 }}` and `transformOrigin: bottom` is about 30 lines of code. Recharts is only worth it if tooltips, axes, and responsive resizing are needed across several charts.

### Gaps
- I didn't measure Chart.js or uPlot, which may sit between visx and Recharts in size.

## Q9. Full open-source fintech/banking app UI templates worth studying (React, React Native, Flutter)

### Takeaway
I found no high-quality, permissively licensed, maintained open-source banking app template. The GitHub results are tiny repos with no license, and the polished options are paid CodeCanyon kits. For design study, the Framer Wallet component, Cult UI's Family Drawer (a remake of the Family wallet's drawer), and free Figma kits are more useful than code templates.

### Cited Findings
- `CP-Pay/frontend`: Expo + Expo Router + TypeScript banking app (balance card, transaction history, savings). 0 stars, no license, pushed 2026-06-04. — [GitHub](https://github.com/CP-Pay/frontend)
- `K3lvinBr/Wallet-App`: React Native + Expo + styled-components wallet UI. 6 stars, no license, last push 2023-01. — [GitHub](https://github.com/K3lvinBr/Wallet-App)
- Paid kits: BankuX (Expo + NativeWind, about 79 screens), Bankify (about 15 screens, 40 components), Splitify (Expo split-bill/wallet with Figma). These are technique and visual reference only (React Native). — [BankuX](https://codecanyon.net/item/bankux-banking-react-native-expo-app-ui-kit/56625378), [Bankify](https://codecanyon.net/item/bankify-banking-crypto-expense-app-template-react-native/60230007), [Splitify](https://codecanyon.net/item/splitify-split-bill-react-native-expo-app-ui-kit/62672686)
- Mockup frames for demoing: Magic UI has iPhone/Android/Safari frames, and Cult UI has an Apple iPhone 17 Pro Max mockup. — [Magic UI](https://magicui.design/docs/components), [Cult UI](https://www.cult-ui.com/docs)

### Inferences
- Use these repos only for screen inventory (balance header, card carousel, transaction rows), not as a code base. The React 19 + Tailwind 4 + Motion stack is better served by the component sources in Q1–Q5.

### Gaps
- I did not search Flutter-specific GitHub showcases in depth (only `mejdi14/flutter_apple_wallet_animation`, 2021, turned up).
- I did not open the Figma Community directly to search "gamified finance" or "streak".
