# Playful-but-clean visual language and "game feel" for a mobile web wallet UI

Research date: 2026-10-10. Scope: look-and-feel only (color, type, shape, buttons, motion, sound, haptics, illustration, celebration moments), not reward mechanics. Implementation target: React 19 + Tailwind 4 + Motion for React (installed: `motion` 14.0.0 in `/Users/naz/Documents/gh/QC-hack/frontend`), PWA, currently a pure-black dark theme.

Method note: Several facts below were verified by direct inspection instead of web sources. I opened font files with fontTools 4.62.1, computed contrast ratios with the WCAG 2.x relative-luminance formula, and read Motion's installed source. Each one is marked "(verified locally)" and gives the file or method. Paths under `frontend/node_modules/` are local files from `motion` 14.0.0 installed in this repo, not web URLs, so they can't be linked.

---

## 1. Duolingo's design system and brand: what makes it feel like a game, and what rules keep it usable?

### Takeaway
Duolingo feels like a game for four reasons: a small set of saturated flat colors led by one signature green, a single rounded shape language enforced everywhere ("pointy shapes are off-brand"), a custom rounded display face, and characters that run on real-time Rive state machines. It stays usable through restraint. The 2026 core-tabs refresh cut type styles to a minimum, swapped containers for whitespace, and questioned whether header art earned its space, since it "took space without communicating anything useful."

### Cited Findings
- **Official guidelines are currently offline.** On 2026-10-10, `design.duolingo.com` and `design.duolingo.com/identity/color` returned a 301 redirect to the blog's design hub. The color values and shape rules below come from search-indexed copies of the official pages. — [design.duolingo.com/identity/color](https://design.duolingo.com/identity/color) (redirects to [blog.duolingo.com/hub/design](https://blog.duolingo.com/hub/design/))
- **Core color:** Feather Green **#58CC02** (RGB 88/204/2, PMS 361 C) is the core brand color. Supporting colors include Macaw **#1CB0F6** (blue) and Eel **#4B4B4B** (dark gray). — [design.duolingo.com/identity/color](https://design.duolingo.com/identity/color) (via search index)
- **Shape language:** Every illustration is built from three basic shapes: the rounded rectangle (the most used), the circle, and the rounded triangle. "Just make sure that every shape has rounded edges. Pointy shapes are off-brand." Illustrators should use as few shapes as possible. — [design.duolingo.com/illustration](https://design.duolingo.com/illustration) (via search index)
- **Character construction rules:** Noses use 1–2 rounded rectangles. Eyes are geometric, never ovals, with a fully rounded "pill" recommended. — [design.duolingo.com/illustration/characters](https://design.duolingo.com/illustration/characters) (via search index)
- **Art-style history:** Early Duolingo art used static, hard-edged shapes on a light gray background. Around 2018 the art team began testing brighter, rounder, friendlier illustrations for Duolingo KIDS, and that work produced the current style. — [Duolingo blog: Shape language](https://blog.duolingo.com/shape-language-duolingos-art-style/)
- **Typography:** Feather Bold is a custom face made with Fontsmith and drawn by Johnson Banks from the owl's form, with feather-like details such as a flicked lowercase "g" and wing-tipped stem junctions. — [Creative Bloq](https://creativebloq.com/news/feather-bold); [Monotype](https://www.monotype.com/es/node/6287)
- **Typography usage rules:** Feather Bold is set in lowercase for display headlines. DIN Next Rounded is used in sentence case for body text. The two should not appear together in the same sentence. This is a third-party summary; I did not find a current official typography page. — [Canny Creative brand breakdown](https://www.canny-creative.com/brand-breakdown/brand/duolingo/)
- **Characters run on Rive state machines.** Rive works like a game engine for UI animation. Duolingo built one animation state per character pose in a lesson, plus separate mouth (viseme) states that run in parallel with the body states. The result is exported as a single runtime file for engineers. — [Duolingo blog: World character visemes](https://blog.duolingo.com/world-character-visemes)
- **Combinatorial idle animation:** For Lily in Video Call, eight head and eight body idle animations combine dynamically into 64+ variations, so the character never visibly loops. The state machine also drives mouth, expression, and camera. — [Rive blog: Duolingo's Lily](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)
- **Restraint rules from the 2026 core-tabs refresh** (Leah Lee, Feb 4, 2026):
  - "Good design means knowing what to remove and what to keep."
  - Type styles were consolidated to a minimal set, and header sizes were tiered by each tab's purpose.
  - Sections are separated by whitespace instead of containers.
  - Artwork in every header "could feel forced" and took space without communicating anything useful.
  - Four color directions were explored: Punchy (solid vibrant headers), Soft (gradients and muted tones), Modular (rounded cards), and Flat (no borders or backgrounds).
  - The team reports higher engagement while core learning metrics held steady.
  - [Duolingo blog: Elevating craft](https://blog.duolingo.com/core-tabs-redesign/)
- **Chunky button depth:** A design-system gallery lists the 4px solid bottom shadow on buttons as a signature Duolingo trait that shouldn't be removed. This is a third-party page; Duolingo itself publishes no button spec that I found. — [oppadu Duolingo design-system page](https://www.oppadu.com/tools/design-systems-site/brand/duolingo.html)
- **Unofficial reverse-engineered spec:** A reverse-engineered DESIGN.md (shadcn.io) gives display sizes of 48–64px and similar details. It is unofficial; treat it as a guess. — [shadcn.io Duolingo DESIGN.md](https://www.shadcn.io/design/duolingo/raw)

### Inferences
- **The game feel comes from consistency, not quantity.** One hero color, one shape family (everything rounded), one display face, and one mascot system. The restraint rules (fewer type styles, whitespace over boxes, no decorative headers) are what keep it from being noisy.
- **The chunky 3D button, for CardMax (my implementation; no canonical Duolingo source):**
  - Use a solid, unblurred offset shadow in a darker shade of the fill as the button's "edge," e.g. `box-shadow: 0 4px 0 <darker>`.
  - On press, translate the button down by the edge height and shrink the edge to zero, e.g. `active:translate-y-1 active:shadow-none` in Tailwind.
  - Prefer `box-shadow` over `border-bottom` for the edge: a shadow doesn't change layout, so siblings don't shift on press.
  - Keep the full button, edge included, at least 44px tall (see section 6).
  - Use this for the single primary action per screen, e.g. "Hold to pay" or "Scan cart." If every control is chunky, the hierarchy collapses.
- **Shape language in Tailwind:**
  - Pick one radius family, e.g. cards `rounded-2xl`/`rounded-3xl`, buttons and chips `rounded-full` or `rounded-2xl`.
  - Avoid sharp corners anywhere, including chart bars: round the bar tops in the Missed chart.
- **Rive is not required.** For a hackathon, a static SVG character or no character plus Motion springs gets most of the effect. Rive (`@rive-app/react-canvas`) is the option if a reactive mascot is wanted. I did not verify that package's version or API.
- **Brand copying risk:** Copying Duolingo's exact green and owl-like shapes would read as derivative. Borrow the rules (rounded everything, one hero color, chunky primary button), not the assets.

### Gaps
- No current official source for Duolingo's button spec (height, radius, edge depth), motion durations, or sound/haptic guidelines. The official site redirected, and I found no Duolingo blog post on button or sound design.
- Which of the four color directions shipped in the core-tabs refresh is not stated.
- Duolingo's own text-color-on-green practice is not confirmed from a source. See section 5 for the contrast math.

---

## 2. Other playful-but-clean references: which elements translate to a finance app?

### Takeaway
The fintech brands that pull off "playful" keep the play in color, voice, and illustration and keep money flows calm. Monzo's 2022 refresh made it "friendlier" with brighter colors and commissioned illustration while keeping a restrained base. Cash App leans on one fluorescent green and custom type. Cleo's play is almost entirely in its copy ("Roast Mode" / "Hype Mode"). Nintendo's Switch OS shows the interaction side: short, responsive animations paired with sound so each action is legible.

### Cited Findings
**Monzo (2022 refresh with Ragged Edge)**
- Hot coral leads the palette, backed by deep navy and soft white. Monzo says hot coral "represents our warmth, our empathy and our human quality." Secondary colors were "carefully selected to maximise accessibility" and to give "extra bursts of energy." The logomark kept its shape, and its colors were made brighter. — [It's Nice That](https://www.itsnicethat.com/news/ragged-edge-monzo-graphic-design-021122); [Creative Review](https://www.creativereview.co.uk/monzo-branding-ragged-edge/); [Monzo blog](https://monzo.com/blog/weve-had-a-little-makeover)
- The refresh aimed to be "more friendly, more human, more Monzo." Monzo commissioned illustrations from Ola Dobrzyńska and said the team had "felt limited by the colours and assets we had to work with." — [Monzo Community Q&A with senior brand designer](https://community.monzo.com/t/we-ve-given-our-visual-brand-a-refresh-q-a-w-jesse-senior-brand-designer/139681); [Creative Review](https://www.creativereview.co.uk/monzo-branding-ragged-edge/)
- Monzo's marketing leads with coral or navy and adds brighter teal or pink for "a real sense of fun and playfulness you don't find elsewhere in the banking market." — [Monzo blog](https://monzo.com/blog/weve-had-a-little-makeover)
- A Marketing Week headline quotes Monzo: "Saying less is the magic sauce." — [Marketing Week](https://www.marketingweek.com/monzo-investment-brand-building/)

**Cash App**
- In late 2025, Cash App announced a new design language with "a more vibrant fluorescent green" and a dedicated typeface, Cash Sans, described as a custom typographic foundation that "balances personality with clarity." — [Design Compass (Dec 3, 2025)](https://designcompass.org/en/2025/12/03/cash-apps-new-design-language-and-ai-moneybot/); [Abduzeedo](https://www.abduzeedo.com/cash-apps-new-design-language-and-ai-assistant-moneybot)
- Cash Green is **#00E013** according to an unofficial, reverse-engineered DESIGN.md. — [shadcn.io Cash App](https://www.shadcn.io/design/cashapp)
- Cash Sans timing conflicts across sources: one dates it to "early 2025," another to the Dec 2025 announcement. The same blog says CashMarket was the brand face from the 2018 rebrand and Agrandir Wide is licensed for marketing. — [Designyourway](https://www.designyourway.net/blog/what-font-does-cash-app-use/), which conflicts with [Design Compass](https://designcompass.org/en/2025/12/03/cash-apps-new-design-language-and-ai-moneybot/) on timing.

**Cleo**
- Cleo's playfulness is mainly voice: casual, meme-heavy language, a "Roast Mode" that teases wasteful spending, and a "Hype Mode" that praises good habits. Reviewers call the design "sleek and intuitive" and "hip, well-designed and easy to use," without describing its visual system. — [Hackr.io](https://hackr.io/blog/cleo-ai); [PaymentsNext](https://paymentsnext.com/finally-a-bff-bank-app-for-gen-zennials/)
- An analyst argues that consumer fintech winners "will look less like software dashboards and more like habit forming characters with financial products attached. Cleo already has the voice." — [Sacra](https://sacra.com/c/cleo)

**Nintendo Switch OS (CEDEC 2018 talk)**
- Sound effects were deliberately coupled with on-screen movement so users could tell what was happening.
- The OS uses rhythmic sound effects with no background music, keeping focus on quick access to content.
- "Animations were made as short as possible while still feeling responsive."
- Confirmation dialogs default the cursor to "Yes" to save steps.
- [Nintendo Wire summary of CEDEC 2018](https://nintendowire.com/news/2018/08/22/nintendo-talks-about-the-design-of-the-switchs-os-at-cedec-2018/); [Famitsu (Japanese)](https://www.famitsu.com/news/201808/22162761.html)
- The Switch home menu's "bleeps and bloops" and the two-note whistle on profile select are often singled out as part of its charm. — [Nintendo Life (2018)](https://www.nintendolife.com/news/2018/08/random_making_music_with_the_switchs_user_interface)
- Nintendo's 2025 Switch 2 showcase highlighted distinct "cute sounds" when opening icons such as eShop and Game Chat. — [My Nintendo News (May 2025)](https://mynintendonews.com/2025/05/18/nintendo-shows-off-switch-2-unique-home-screen-sounds/)

### Inferences
- **What translates to CardMax:**
  - **One signature accent** (Monzo coral, Cash green, Duolingo green) on a calm base. CardMax's pure-black base already suits this; pick one hero accent for "value/win" and at most 2–3 secondary bursts.
  - **Voice as the playful layer.** Cleo shows copy can carry personality without visual noise. Example lines: "Chase Sapphire takes it: 3x on dining." "You left $4.20 on the table this week."
  - **Sound paired with motion for key moments only**, as on the Switch. Use it for the card win, the pay hold completing, and the receipt; not for scrolling or tab switches.
  - **Commissioned-style illustration in empty states only** (Monzo), not in every header (the Duolingo lesson in section 1).
- **What not to borrow:**
  - Game HUD density (many counters and badges on screen).
  - Looping ambient animation on money screens.
  - Background music.

### Gaps
- **Not researched in this pass, so the report should not claim specifics about them:**
  - Headspace (brand, illustration, animation).
  - Revolut Ultra and metal-card visuals.
  - Arc browser's playful details.
  - A direct Linear-vs-Duolingo comparison.
  - The PlayStation 5 UI.
  - Mobile game HUDs (Clash Royale, Pokémon GO).
- Monzo's official hot coral hex value was not found in these sources.
- Cleo's visual identity (palette, type, dark mode) was not found. Only voice is documented.
- No official Cash App brand-guidelines page was found.

---

## 3. "Game feel" and "juice" for UI: techniques, and how practitioners bound them

### Takeaway
Game-feel talks give the vocabulary: tweening and easing, squash and stretch, particles, screenshake and flashes, sound, and "eyes" that react, all as cascading responses to small inputs. Web-animation practitioners give the limits: keep UI motion short (usually under 300ms), make it interruptible, never animate high-frequency actions, and save novelty (sparkles, sound) for short, direct, infrequent actions. Motion's defaults already encode the right physics for transforms.

### Cited Findings
**Game-feel sources**
- "Juice It or Lose It" (Martin Jonasson and Petri Purho, GDC Europe 2012, about 15 minutes) starts from a plain Breakout clone and adds, in order:
  - color;
  - tweening/easing;
  - squeeze and stretch (scaling objects on events, wobble on bounce);
  - sound and music (with the scene reacting to rhythm);
  - particles (smoke, shatter, trails), "in moderation";
  - screenshake and flashes;
  - eyes and expressions that track and react.
  - [RPG Playground write-up](https://rpgplayground.com/research-making-a-juicy-game/); [Game Developer](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-)
- A juicy game "feels alive and responds to everything the player does, tons of cascading actions and response for minimal user input." — [Kenney: must-see videos](https://kenney.nl/learn/must-see-videos-for-indie-developers)
- **Counterpoint:** Folmer Kelly's GDC talk "Don't Juice It or Lose It" argues that piling on polish can cost immersion. — [Game Developer](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-)
- "The Art of Screenshake" (Jan Willem Nijman, Vlambeer, about 40 minutes) gives a single-pistol-shot example from Nuclear Throne:
  - the camera is kicked a few pixels in the aim direction;
  - "add 4 to the screenshake," which decays quickly;
  - "weapon kick" moves the gun sprite back slightly, then it "super quickly slides back into place."
  - [infovore.org: Making Game "Feel"](https://infovore.org/?p=5275)

**Web-animation practitioners**
- **Josh W. Comeau, "A Million Little Secrets"** (whimsical-animations landing page; Feb 24, 2025, updated May 5, 2026):
  - "A crucial ingredient for whimsy is novelty." He avoids generic copy-paste confetti.
  - "Boop": briefly apply an override style on hover and unset it after a short interval, which gives a burst of motion.
  - Sparkle particles use polar coordinates: a random angle inside a 45° cone, a random distance of 30–60px, CSS `cos()`/`sin()`, and a 1000ms ease-out. Add random rotation, randomize duration and delay, fade particles out, remove them from the DOM, and use spring-derived `linear()` easing.
  - Sound: slider ticks pick one of 5 random samples; buttons have 3 press + 3 release samples. Continuous effects stay silent ("we don't have to add sound effects to everything!").
  - The article does not cover reduced motion.
  - [joshwcomeau.com](https://www.joshwcomeau.com/blog/whimsical-animations/)
- **Emil Kowalski, "Great Animations":**
  - Animations "should also usually be shorter than 300ms." A 500ms enter on a frequently used tool feels too slow.
  - Use `ease-out` for snappy UI.
  - Never animate keyboard-initiated actions.
  - Every animation needs a purpose (explain something or signal a state change). Consider how often users will see it.
  - Animate only `transform` and `opacity`.
  - Keep animations interruptible.
  - Respect `prefers-reduced-motion`: swap in fades in CSS, use `useReducedMotion` in Motion.
  - [emilkowal.ski](https://emilkowal.ski/ui/great-animations)
- **Rauno Freiberg, "Invisible Details of Interaction Design"** (July 2023):
  - "Great interactions are modeled after properties from the real world, like interruptability."
  - "Truly fluid gestures are immediately responsive": track the finger, then animate past a threshold.
  - Gestures should keep momentum and angle.
  - Where something enters from should reflect where it lives spatially.
  - Repeated animation becomes "cognitive burden after seeing the same animation for the hundredth time."
  - A brief accent-color blink confirms a selection.
  - [rauno.me](https://rauno.me/craft/interaction-design)

**Motion for React defaults** (verified locally: `motion` 14.0.0, `frontend/node_modules/motion-dom/dist/cjs/index.js`)
- Base spring defaults: `stiffness: 100, damping: 10, mass: 1`; for duration-based springs, `duration: 800ms, bounce: 0.3, visualDuration: 0.3s`. — local source, lines 819–827
- The public docs page says `bounce` defaults to 0.25. The WebFetch summary also reported a `stiffness` default of 1, which is likely a parse error. The installed source shows 0.3 and 100, so trust the installed version. — [motion.dev transitions docs](https://motion.dev/docs/react-transitions), contradicted by the installed source above.
- `bounce` ranges from -1 to 1 (0 = critically damped, negative = overdamped). `visualDuration` sets when the motion visually "arrives," with the bounce mostly after it. Physics springs (`stiffness`/`damping`/`mass`) keep gesture velocity; duration-based springs don't, and can be generated as pure CSS. — [motion.dev transitions docs](https://motion.dev/docs/react-transitions)
- Default transition when none is given (`getDefaultTransition`):
  - `x`/`y`/`rotate` get an underdamped spring (`stiffness 500, damping 25`), so they overshoot slightly.
  - `scale` gets a critically damped spring (`stiffness 550`), with no overshoot when animating to 0.
  - Non-transform values get a 0.3s tween with ease `[0.25, 0.1, 0.35, 1]`.
  - Three or more keyframes get 0.8s keyframes.
  - local source, lines 3697–3731
- `MotionConfig reducedMotion` accepts `"always" | "never" | "user"`. With `"user"`, it switches transform animations off when the device prefers reduced motion. — local `framer-motion/dist/index.d.ts` lines 208, 229–235

**Number tick-ups**
- NumberFlow (`@number-flow/react`):
  - Animates per-digit spins and formats with `Intl.NumberFormatOptions` (`format`, `locales`, `prefix`, `suffix`).
  - `respectMotionPreference` defaults to `true`.
  - `trend` controls spin direction.
  - Separate `transformTiming`, `spinTiming`, and `opacityTiming` props.
  - A `continuous` plugin makes values appear to pass through in-between numbers.
  - Its docs recommend `font-variant-numeric: tabular-nums` so digits don't shift during transitions.
  - [number-flow.barvian.me](https://number-flow.barvian.me/)
- A Motion-based variant, `motion-number`, is "based on Maxwell Barvian's NumberFlow." — [npm: motion-number](https://npmjs.com/package/motion-number)

**Confetti**
- `canvas-confetti` has a `disableForReducedMotion` option that defaults to false. When true, it suppresses confetti for reduced-motion users and the returned promise resolves immediately. The maintainer has said the default may change in a future major version, so set it explicitly. — [canvas-confetti README (unpkg)](https://unpkg.com/canvas-confetti@1.4.0/README.md)

### Inferences
These are concrete, implementable mappings for CardMax.
- **Press feedback on every tappable surface.**
  - Use `whileTap={{ scale: 0.97 }}` with the default critically damped scale spring, which avoids rubbery overshoot on press.
  - Reserve visible overshoot (bounce around 0.3–0.4) for "arrival" moments: the winning card lifting and the receipt dropping in.
  - Emil's under-300ms guidance applies to routine UI. Celebration moments can run longer because they are rare.
- **Squash and stretch, kept subtle.**
  - On a card win, a quick `scaleY` 0.98 then 1.02 then 1, plus a `y` lift with a soft spring, reads as "jumping up."
  - Keep it to one axis and a single cycle.
- **Anticipation for hold-to-pay.**
  - Drive a progress ring from the press duration.
  - Make the card track the finger (Rauno), not a fixed timeline.
  - Release before completion should spring back (interruptible).
  - Completion triggers the radar pulse, chime, and haptic together, the Switch "sound coupled with motion" principle.
- **Particles: few and bespoke** (Comeau).
  - 6–12 small shapes in the accent color, emitted from the winning card or the total, using the polar-coordinate recipe.
  - Avoid full-screen generic confetti on every scan. Save bigger bursts for rare thresholds, such as the first time total value back crosses a round number.
- **Number tick-ups:** Use NumberFlow, or Motion's `animate` on a motion value, for "total value back" and the Missed counter, with `tabular-nums`. The Missed counter should tick up calmly; it's a loss, not a win.
- **Never animate:** tab switches beyond a short crossfade, list re-sorts the user didn't trigger, and anything in a repeated scroll path.

### Gaps
- No full technique list or transcript was retrieved for "The Art of Screenshake" (hitstop, permanence, and so on). Only the pistol-shot example is sourced.
- No primary Duolingo or Rive case study gives timing numbers for celebration animations.
- I did not verify Motion's own `AnimateNumber` component (Motion+) or its licensing.

---

## 4. Sound and haptics in web/mobile UI: when to use them, and iOS Safari limits

### Takeaway
Web haptics on iOS have no standards path. Safari doesn't support the Vibration API; the only trick programmatically clicks a hidden `<input type="checkbox" switch>`. That trick is fragile, may be patched (one unverified report says iOS 26.5), and gives only one fixed tap pattern. Web audio on iOS must be unlocked inside a user gesture and may be muted by the silent switch. Treat both as optional garnish on top of visual feedback. Rich haptics (Core Haptics patterns) need a native iOS wrapper.

### Cited Findings
**Haptics**
- **WebHaptics (`web-haptics` on npm, by lochie):**
  - Creates a visually hidden `<input type="checkbox" switch>` with a linked label and clicks it programmatically; iOS plays its default switch haptic.
  - The `switch` attribute is currently Safari-only.
  - API: `new WebHaptics()`, `haptics.trigger(pattern?)` with steps of `duration`/`delay`/`intensity`, `defaultPatterns` presets such as `success`, and a `useWebHaptics` hook from `web-haptics/react`.
  - Falls back to `navigator.vibrate()` where supported (Android), via `toVibratePattern`.
  - The author calls it a hack that could stop working, and notes WebKit opposes the Vibration API.
  - [azukiazusa.dev (Mar 4, 2026)](https://azukiazusa.dev/en/blog/ios-safari-web-haptics)
- `ios-haptics` uses the same switch technique. Its maintainers warn it might stop working if Apple changes how it handles these controls. — [npm: ios-haptics](https://npmjs.com/package/ios-haptics); [README](https://unpkg.com/ios-haptics@0.0.8/README.md)
- **When switch haptics arrived:**
  - The `ios-haptics` README ties the switch control to Safari 17.4. A WebKit bug report and an Ionic issue say switch haptics were introduced in iOS Safari 18.0. This is unresolved. — [ios-haptics README](https://unpkg.com/ios-haptics@0.0.8/README.md), which conflicts with [WebKit bug 285120](https://bugs.webkit.org/show_bug.cgi?id=285120) and [Ionic issue 29942](https://github.com/ionic-team/ionic-framework/issues/29942)
  - The WebKit report (late 2024) argued switch haptics should require user activation, because otherwise JavaScript can trigger vibrations at will. It is marked resolved/fixed, but the change isn't described. — [WebKit bug 285120](https://bugs.webkit.org/show_bug.cgi?id=285120)
  - One third-party tester site claims programmatic iOS haptics work on iOS 17.4–26.4 and that Apple patched the behavior in iOS 26.5. This is single-source and unverified, with no Apple confirmation found. — [rapidtoolset iOS Haptics Tester](https://rapidtoolset.com/en/tool/ios-haptics-tester)

**Audio**
- iOS starts the Web Audio `AudioContext` suspended ("locked"). It must be `resume()`d inside the first user interaction. A common pattern listens for `touchstart`/`touchend`/`mousedown`/`keydown`. A `touchend`-only unlock fails for swipes and long presses, so retry until an unlock sound actually plays. — [Matt Montag](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos); [HackerNoon](https://hackernoon.com/unlocking-web-audio-the-smarter-way-8858218c0e09)
- The physical silent switch reportedly mutes ambient-category Web Audio on iOS, and there is no API to read its state. The suggested workaround starts a looping silent `<audio>` element on the first gesture, after which Web Audio reportedly ignores the switch. This is single-source and unverified against Apple documentation. — [bugnet.io](https://bugnet.io/blog/how-to-fix-ios-web-game-audio-muted-by-the-silent-switch)
- **Sound design practice:**
  - Comeau randomizes among several short samples (5 for slider ticks; 3 press + 3 release for buttons) and splits a sound across press and release, so repeated actions don't sound robotic.
  - Continuous effects stay silent. Sound should be "tasteful and not too loud."
  - [joshwcomeau.com](https://www.joshwcomeau.com/blog/whimsical-animations/)
- Nintendo coupled each sound effect to on-screen movement and used no background music in the Switch OS. — [Nintendo Wire (CEDEC 2018)](https://nintendowire.com/news/2018/08/22/nintendo-talks-about-the-design-of-the-switchs-os-at-cedec-2018/)

### Inferences
- **Sound plan for CardMax:**
  - Use 3–4 sounds total: a soft tick for card selection, a rising two-note "win" for best card, a chime when the pay hold completes, and maybe a paper "receipt" swish.
  - Each sound should be short, randomized across 2–3 variants, and paired with a visible animation.
  - Unlock the AudioContext on the first tap anywhere.
  - Add a visible sound toggle that defaults to off, or on only after the first explicit interaction, and store it in `localStorage`.
  - Never rely on sound to convey information; the visuals must stand alone.
  - Josh Comeau's `use-sound` hook exists for this pattern, but I did not verify its current version or API in this pass.
- **Haptics plan:**
  - Call `navigator.vibrate` on Android. Optionally use the switch-click trick on iOS through `web-haptics`, triggered only inside a real tap or press handler (pay-hold completion, card win).
  - Assume it might do nothing on the judges' iPhones. The radar pulse, chime, and success state must carry the moment alone.
  - Multi-pulse, intensity-shaped patterns on iOS need a native wrapper (Core Haptics / `UIImpactFeedbackGenerator` via Capacitor or a native shell). That needs native iOS, which this PWA isn't.
- **Simulation honesty:** Per the project's AGENTS.md, the pay flow is simulated. The chime and haptic must not imply a real NFC or terminal transaction, e.g. label it "Simulated tap."

### Gaps
- Not resolved: which iOS version first exposed switch haptics (17.4 vs 18.0), and whether iOS 26.5 actually broke the trick.
- No official Apple or WebKit statement found on silent-switch handling for Web Audio.
- No source found on UI-sound loudness norms, or on whether PWAs added to the home screen behave differently for audio unlock.
- Common UI-sound libraries `use-sound` (Josh Comeau) and `howler.js` exist, but neither's current version or API was verified in this pass.

---

## 5. Typography and color for playful dark-mode UIs that don't look childish

### Takeaway
For a rounded, friendly face that still works for money:
- On Apple devices, `ui-rounded` (SF Pro Rounded) is free, but it works only in Safari/WebKit and needs `tabular-nums` set explicitly.
- As a webfont fallback, Nunito is the strongest choice for numbers: its digits are equal-width at every weight tested.
- Rubik, Varela Round, and Baloo 2 also offer tabular figures.
- Fredoka and Quicksand have proportional digits and no `tnum`, so keep them off amounts.

Saturated brand greens and blues pass contrast easily as text or fills on black. White text on top of those bright fills fails WCAG badly, so use dark text on bright buttons.

### Cited Findings
- **`ui-rounded` support:**
  - Apple added the `ui-rounded`, `ui-serif`, `ui-sans-serif`, and `ui-monospace` families in Safari 13.1 (iOS 13.4). Together they expose San Francisco and New York faces: `ui-rounded` gives SF Rounded, and `ui-serif` gives New York. — [caniuse: extended system fonts](https://caniuse.com/extended-system-fonts); [furbo.org](https://furbo.org/2018/03/28/system-fonts-in-css/)
  - Chrome, Edge, and Firefox don't support `ui-rounded`; MDN's compat data was updated in January 2025 to say so. — [caniuse](https://caniuse.com/extended-system-fonts); [MDN browser-compat-data PR 25665](https://github.com/mdn/browser-compat-data/pull/25665)
- **SF Rounded figures (verified locally, macOS `/System/Library/Fonts/SFNSRounded.ttf` via fontTools):**
  - Has `tnum` and `pnum` GSUB features.
  - Default digits are proportional (widths 908–1242 units).
  - Axes: `wght` 1–1000 and `GRAD` 400–1000.
  - Checked on macOS, not iOS; assumed the same family.
- **Google Fonts rounded faces** (verified locally from [google/fonts on GitHub](https://github.com/google/fonts/tree/main/ofl); GSUB and `hmtx` inspected with fontTools 4.62.1 on 2026-10-10):
  - **Nunito** ([Nunito[wght].ttf](https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf)): no `tnum` feature, but all digits are 600 units wide by default and stay equal at wght 700 and 900, so it is tabular out of the box. Weight axis 200–1000.
  - **Rubik** ([Rubik[wght].ttf](https://github.com/google/fonts/raw/main/ofl/rubik/Rubik%5Bwght%5D.ttf)): proportional by default; has `tnum` and `pnum`. Weight axis 300–900. A third-party listing also notes Rubik's tabular figures. — [fontalternatives.com](https://fontalternatives.com/fonts/rubik/)
  - **Varela Round** ([VarelaRound-Regular.ttf](https://github.com/google/fonts/raw/main/ofl/varelaround/VarelaRound-Regular.ttf)): tabular by default; has `tnum`. Single weight only.
  - **Baloo 2** ([Baloo2[wght].ttf](https://github.com/google/fonts/raw/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf)): proportional by default; has `tnum`. Weight axis 400–800.
  - **Fredoka** ([Fredoka[wdth,wght].ttf](https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka%5Bwdth,wght%5D.ttf)): proportional digits (still proportional at wght 700) and no `tnum`. Weight axis 300–700, width axis 75–125.
  - **Quicksand** ([Quicksand[wght].ttf](https://github.com/google/fonts/raw/main/ofl/quicksand/Quicksand%5Bwght%5D.ttf)): proportional digits, no `tnum`.
  - **M PLUS Rounded 1c Bold:** tabular by default, no `tnum`.
- **Contrast (computed locally with the WCAG 2.x relative-luminance and contrast formula, [WCAG 2.2 definition](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance)):**

  | Color | on #000000 | on #121212 | on #1C1C1E | white text on it | black text on it |
  |---|---|---|---|---|---|
  | Duolingo Feather Green #58CC02 | 10.05 | 8.97 | 8.15 | **2.09 (fails)** | 10.05 |
  | Duolingo Macaw #1CB0F6 | 8.59 | 7.66 | 6.96 | **2.44 (fails)** | 8.59 |
  | Duolingo Eel #4B4B4B | **2.41 (fails)** | 2.15 | 1.95 | 8.72 | 2.41 |
  | Cash Green #00E013 (unofficial hex) | 11.67 | 10.41 | 9.46 | **1.80 (fails)** | 11.67 |
  | Hot coral #FF4F40 (illustrative, not Monzo's verified hex) | 6.44 | 5.75 | 5.22 | **3.26** (passes 3:1 large text only) | 6.44 |
  | Tailwind red-500 #EF4444 | 5.58 | 4.98 | 4.52 | 3.76 | 5.58 |
  | White #FFFFFF | 21.00 | 18.73 | 17.01 | — | — |

  WCAG AA requires 4.5:1 for normal text and 3:1 for large text — [WCAG 2.2 SC 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum) — and 3:1 for UI components and graphical objects — [WCAG 2.2 SC 1.4.11](https://www.w3.org/TR/WCAG22/#non-text-contrast).
- **Fintech trust:** Practitioner blogs (opinion, not studies) argue that cheap-looking fintech loses users and that trust signals include "consistent spacing, purposeful color palettes, and zero visual noise in the transaction flow." They warn against loud elements that undercut the seriousness of transactions. — [The Skins Factory](https://www.theskinsfactory.com/uiux-design-blog/fintech-ui-ux-design); [Uptech](https://www.uptech.team/blog/banking-app-design)

### Inferences
- **Font stack for CardMax:**
  - Self-host Nunito via `@fontsource-variable/nunito` (package not verified this pass), or use Google Fonts.
  - Stack: `font-family: ui-rounded, "Nunito Variable", system-ui, sans-serif;`
  - Apply `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) to every amount, percentage, and counter. It's required for SF Rounded and harmless for Nunito.
  - A display/body split à la Duolingo is optional. A single rounded family in 2–3 weights (e.g. 600 body, 800 display) keeps it minimalist.
  - Don't use Fredoka or Quicksand for numbers. Fredoka could work for a logotype or a single hero word only.
- **Accent usage on pure black:**
  - A bright green or blue accent is safe as text, icons, and borders: about 8–11:1, well above AA.
  - For filled primary buttons in a bright accent, use near-black text (`#000` or a deep tint of the hue, about 10:1). White text on #58CC02 is 2.09:1.
  - Gray mid-tones like #4B4B4B are unusable for text on black (2.41:1). For secondary text on black, use roughly #8E8E93 or lighter, and check it.
- **Avoiding "childish" in a money app:**
  - Keep the rounded face but use heavier weights and tight sizes for amounts.
  - Restrict color bursts to win states.
  - Keep transaction and receipt surfaces calm and monochrome.
  - Use playful copy in empty states and celebrations, never in amounts or fees.
  - Avoid mascots on the payment surface.
- **Pure black vs. near-black:** Pure black (#000) maximizes contrast and suits OLED. Elevated surfaces (cards, sheets) still need lighter tones (e.g. #121212 / #1C1C1E) to show depth. The Material guidance on this couldn't be retrieved (see Gaps).

### Gaps
- The Material Design dark-theme page (m2.material.io) returned no content: it is JS-rendered. Its guidance on desaturated accents, the #121212 base, and elevation overlays is therefore not sourced here.
- Not checked: DIN Round alternatives (e.g. commercial DIN Next Rounded licensing), or whether SF Pro Rounded on iOS matches the macOS file.
- No APCA contrast values were computed, only WCAG 2.x.

---

## 6. Accessibility and restraint

### Takeaway
Ship every celebration in two versions:
- **Full:** spring, particles, sound, haptic.
- **Reduced:** an opacity/color change plus a static success state.

WCAG's motion criterion is AAA, not AA, but honoring `prefers-reduced-motion` is cheap with Motion (`MotionConfig reducedMotion="user"`), canvas-confetti (`disableForReducedMotion: true`), and NumberFlow (`respectMotionPreference` defaults to true). Chunky buttons should meet at least the 24×24px AA target minimum; 44px is the practical goal.

### Cited Findings
- **WCAG 2.3.3 Animation from Interactions is Level AAA.** "Motion animation triggered by interaction can be disabled, unless the animation is essential." Sufficient techniques: C39 (CSS `prefers-reduced-motion`) and SCR40 (the same query in JavaScript). — [W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
  - A design-system guide claims respecting reduced motion is a WCAG 2.1 AA requirement. That is incorrect: it's AAA. — [Verdigris reduced-motion guide](https://design.verdigris.co/categories/animation/reduced-motion), contradicted by [W3C](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- **WCAG 2.5.8 Target Size (Minimum), Level AA:** pointer targets must be at least 24×24 CSS px. Exceptions cover spacing (a 24px circle centered on the target doesn't intersect other targets), an equivalent control, inline targets, user-agent defaults, and essential presentation. W3C suggests aiming for the stricter 2.5.5 Target Size (Enhanced) on important controls. — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Library support for reduced motion:**
  - Motion's `MotionConfig` `reducedMotion` (`"always" | "never" | "user"`) switches transform animations off under the device preference. — local `framer-motion/dist/index.d.ts` (Motion 14.0.0)
  - Motion also offers a `useReducedMotion` hook. — [Emil Kowalski](https://emilkowal.ski/ui/great-animations)
  - `canvas-confetti`'s `disableForReducedMotion` defaults to false, so set it explicitly. — [canvas-confetti README](https://unpkg.com/canvas-confetti@1.4.0/README.md)
  - NumberFlow's `respectMotionPreference` defaults to true. — [number-flow.barvian.me](https://number-flow.barvian.me/)
- **Restraint principles:**
  - Animations need a purpose and should be paced so the interface doesn't overwhelm. — [Emil Kowalski](https://emilkowal.ski/ui/great-animations)
  - Repeated animations become "cognitive burden." — [Rauno Freiberg](https://rauno.me/craft/interaction-design)
  - Particles "in moderation." — [RPG Playground on "Juice it or lose it"](https://rpgplayground.com/research-making-a-juicy-game/)
  - Continuous effects stay silent. — [Josh Comeau](https://www.joshwcomeau.com/blog/whimsical-animations/)
- **Tabular figures** prevent digits from shifting during number transitions. — [number-flow.barvian.me](https://number-flow.barvian.me/)

### Inferences
- **Reduced-motion variants for CardMax:**

  | Moment | Full | Reduced |
  |---|---|---|
  | Best card wins | lift + spring overshoot + glow pulse + particle burst + tick sound | instant reorder with a 150ms opacity crossfade, static glow, "Best card" badge |
  | Hold-to-pay | progress ring + radar pulses + chime + haptic | progress ring still fills (it's essential feedback for a timed hold) + no pulses + checkmark |
  | Receipt | slide-up with bounce | fade in |
  | Value tick-up | digit spin | plain text swap (NumberFlow default) |
  | Missed counter | ticks up | static number |

- **Implementation:**
  - Wrap the app in `<MotionConfig reducedMotion="user">`.
  - Gate particles and confetti behind `useReducedMotion()`.
  - Gate sound behind an explicit user toggle, independent of motion.
- **Hold-to-pay accessibility:**
  - Provide a non-hold alternative (a tap that opens a confirm step). Long-press is hard for some motor impairments and for screen-reader users.
  - Announce completion via an `aria-live` region ("Payment simulated with Chase Sapphire").
- **Tap targets:**
  - Make the chunky primary button at least 48px tall, edge included.
  - Make card-stack tap areas the full card. Keep chips and segmented controls at 44px or more on touch.
- **Motion budget:** At most one "celebration" per user action, and nothing looping on idle screens. The radar pulse should stop once the hold is released or completes.

### Gaps
- No user-research data found on how often celebration animations annoy repeat users in finance apps.
- Not sourced: Apple HIG's 44×44pt minimum and the 2.5.5 Enhanced threshold. The W3C 2.5.8 page didn't state the 44px figure.

---

## 7. Dribbble, Behance, and Mobbin examples of "gamified finance app" concepts

### Takeaway
I found no well-regarded, citable critique of specific Dribbble, Behance, or Mobbin "gamified finance" concepts in this pass. Commentary that does exist is mostly agency and vendor blogs. Their consensus: playfulness is accepted when it is visually restrained and kept out of the transaction and money-movement flows. The one peer-reviewed source covers children's fintech apps.

### Cited Findings
- **Academic:** A 2026 *Childhood* paper (Nansen, Bliss, Sandberg) examines "playful affordances and gamified interface designs" in children's fintech apps as a key appeal mechanism. It does not address adult trust. — [University of Melbourne listing](https://findanexpert.unimelb.edu.au/scholarlywork/2295677-making%20finance%20fun-%20playful%20affordances%20and%20gamified%20interface%20designs%20in%20childrene28099s%20fintech%20apps)
- **Agency critique:** Cheap-looking fintech apps lose users because "something feels off." Trust comes from consistent spacing, purposeful palettes, and "zero visual noise in the transaction flow." — [The Skins Factory](https://www.theskinsfactory.com/uiux-design-blog/fintech-ui-ux-design)
- **Pro-gamification vendor view:** Streaks and badges can seem childish at first but tap into people's enjoyment of recognition and visible progress. This source cites a "50% engagement increase" from a 2023 study that I could not verify. — [Yellowslice](https://www.yellowslice.in/blog/fintech-startups-winning-trust-through-fun-interfaces)
- **Transparency over decoration:** Users stop trusting a banking app when they discover undisclosed fees. — [Uptech](https://www.uptech.team/blog/banking-app-design)

### Inferences
- **Common failure modes** in gamified finance concepts (inferred from the trust commentary above and the restraint principles in sections 3 and 6, not from a specific Dribbble critique):
  - confetti and mascots on transaction screens;
  - too many accent colors;
  - game-HUD density (XP bars, coins, badges everywhere);
  - proportional digits on animated balances;
  - low-contrast neon-on-neon text.
- **The pattern that holds up:**
  - a calm monochrome base;
  - one accent for "win";
  - play concentrated in rare moments (card win, pay complete);
  - personality in copy and empty-state illustration.

### Gaps
- No specific Dribbble, Behance, or Mobbin shots were retrieved or evaluated. A follow-up should browse Mobbin for real shipped apps (Monzo, Cash App, Cleo, Revolut screens) instead of concept shots, which are often unbuildable.
- The "50% engagement" gamification statistic is unverified and should not be used.
