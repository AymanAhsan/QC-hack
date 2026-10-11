# Apple Wallet and Apple Pay on iPhone: interaction design and visual anatomy (researched 2026-10-10)

**Version note for the report writer.** The brief says "iOS 26 era", but iOS 27 is now the current release. Apple's iPhone User Guide defaults to iOS 27 (its version picker lists "iOS 27, iOS 26, …" and the table of contents has "What's new in iOS 27"), and the Apple Support articles used below say "Published Date: September 14, 2026" ([Make purchases using Apple Pay](https://support.apple.com/en-us/102626), [Pay with rewards](https://support.apple.com/en-us/120479), [Pay with installments](https://support.apple.com/en-us/120477)). MacRumors' iOS 27 Wallet guide (Aug 10, 2026) said iOS 27 would launch in September, and pages dated Sept 13–14, 2026 say it is rolling out ([MacRumors](https://www.macrumors.com/guide/ios-27-wallet)). Each finding is tagged **[iOS 27]**, **[iOS 26]**, or **[older]**. Untagged findings come from evergreen HIG pages or are version-neutral. Two kinds of source are labeled throughout: Apple's official copy, and third-party or recreation material.

**Two different Apple Pay surfaces. Don't mix them up.**
(a) **In-store presentation.** You double-click the side button and Wallet shows your card, then you hold the phone near a reader. CardMax's hold-to-pay control copies this one.
(b) **The in-app/web payment sheet.** This is the sheet a merchant app or website opens from an Apple Pay button. It shows line items, shipping, and a "Pay [Business]" total.
Most of the HIG "Apple Pay" page covers (b).

---

## 1. Wallet home: header, card stack, ordering, tap behavior, return

### Takeaway
Apple documents the Wallet home's controls and ordering but not its geometry. The controls are an **Add Card** ("+") button, a **Search** button, and a **More** ("…") button. The default payment card is the **front of the stack**, and you reorder by touch-and-hold then drag. Passes are designed so only their **header row stays visible while collapsed** in the stack. No official source gives the overlap height, the number of visible cards, or the tap and collapse animation. Those are gaps, not facts.

### Cited Findings
- **[iOS 27] Header controls.** The guide names three Wallet-home buttons by their accessibility labels.
  - "Tap [the Add Card button]. You may be asked to sign in to your Apple Account. Choose a category, then follow the onscreen instructions." — [Set up cards and passes in Wallet (iOS 27)](https://support.apple.com/guide/iphone/set-up-cards-and-passes-iph9b7f53382/27.0/ios)
  - "Tap [the Search button], then enter what you're looking for. You can search by merchant, date, transaction amount, location, and more." — [Manage passes, cards, and keys (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios)
  - "Tap [the More button], then tap Expired" (expired passes) — [Manage passes, cards, and keys (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios)
- **[iOS 27] More (…) menu items on the Wallet home**, as documented:
  - **Preauthorized Payments**: "Tap [the More button], then tap Preauthorized Payments" — [Make purchases with Apple Pay (iOS 27)](https://support.apple.com/guide/iphone/make-purchases-with-apple-pay-iphbd4cf42b4/27.0/ios)
  - **Expired**: see the previous finding — [Manage (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios)
  - **Discover**: "tap [the More button], then tap Discover" — [Set up (iOS 27)](https://support.apple.com/guide/iphone/set-up-cards-and-passes-iph9b7f53382/27.0/ios)
  - **[iOS 26] Orders and Notification Settings**: "tap the three-dot button and select Orders", and "Tap the three-dot button, go to Notification Settings, and toggle off 'Offers & Promotions'". This is third-party — [iGeeksBlog, Aug 22 2025](https://www.igeeksblog.com/ios-26-wallet-app-new-features/)
- **[iOS 27] "+" also hosts the new Create a Pass flow.** Templates are Standard, Membership, and Event. Search-result snippets from MacRumors/9to5Mac describe it as sitting "behind the + button". I didn't read the full articles for that detail — [9to5Mac, Sept 14 2026](https://9to5mac.com/2026/09/14/heres-everything-new-for-apple-wallet-in-ios-27/); the template names and 12 background colors are confirmed by [MacRumors iOS 27 Wallet guide](https://www.macrumors.com/guide/ios-27-wallet).
- **Ordering and default card.** "Touch and hold a card you want to move. Drag the card to a new position in the stack. Tip: To make a credit or debit card your default payment card, drag it to the front of the card stack." — [Set up (iOS 27)](https://support.apple.com/guide/iphone/set-up-cards-and-passes-iph9b7f53382/27.0/ios). You can also set the default in Settings > Wallet & Apple Pay > Apple Pay Defaults > "Transaction defaults: Set the default card…" — [Make purchases (iOS 27)](https://support.apple.com/guide/iphone/make-purchases-with-apple-pay-iphbd4cf42b4/27.0/ios)
- **How much of each card shows in the stack (pass design rule).** Pass header fields "Show critical information that remains visible when the pass is collapsed." Also: "Show essential information, like an event date or account balance, in the header so people can see it when the pass is collapsed in Wallet." — [HIG: Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet). The logo sits "in the top leading corner of passes" — same source.
- **Expired passes are hidden** from the stack automatically: "Wallet automatically hides expired passes to reduce crowding, and provides a button that lets people revisit them." — [HIG: Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet)
- **Tap a card to open its details.** "Tap an item to see its details" — [Manage (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios). The guide doesn't describe the animation or how you get back to the stack.
- **In payment mode the other cards sit at the bottom of the screen.** "To switch to a different card, tap the cards at the bottom of the screen, then choose another card." — [Make purchases (iOS 27)](https://support.apple.com/guide/iphone/make-purchases-with-apple-pay-iphbd4cf42b4/27.0/ios). The Support article words it differently: "To use a different card, tap your default card to see your other cards. Tap a new card and authenticate." — [Apple Support 102626 (Sept 14 2026)](https://support.apple.com/en-us/102626)
- **[iOS 27] Pass visual changes.** Memberships, loyalty, rewards, and gift cards can use the bolder "Poster Generic" style, which has a full background image and a primary logo. Each pass can have "up to two actions that can be tapped from the bottom" — [MacRumors iOS 27 Wallet guide](https://www.macrumors.com/guide/ios-27-wallet). The HIG confirms the poster generic style, adding that "a material strip covers the bottom edge of the image" — [HIG: Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet). The HIG's change log reads "June 8, 2026 | Updated to reflect guidance for iOS 27 and the Pass Designer app" — same source.
- No source fetched for this research describes a Liquid Glass redesign of the card stack itself, in either iOS 26 or iOS 27 coverage. MacRumors' iOS 27 guide lists no visual changes to the stack, the card detail view, or the tap-to-pay screen — [MacRumors iOS 27 Wallet guide](https://www.macrumors.com/guide/ios-27-wallet)

### Inferences
- **Feedback (d), "+" icon in the header:** this matches Apple's model. Apple's "+" (Add Card) sits next to Search and More (…). CardMax can put "+" (add/manage cards) top-right and optionally a "…" menu, and drop the big "Manage cards" button.
- **Stack geometry:** the HIG rule ("header… visible when the pass is collapsed") means the collapsed stack shows a **header strip of each card**: logo/issuer at top-leading, key value at top-trailing. Each card overlaps the one above it, and the front (default) card is the only one shown in full. For credit cards in CardMax, show the top band of each card (issuer and network mark, plus maybe the multiplier). Treat the exact strip height as a design choice; Apple doesn't document it.
- **Feedback (a), remove the "Pick a store first" gate:** Apple never gates a card behind context. Tapping any card always opens it. Store detection in CardMax should reorder or highlight the stack (the "best card" moves to the front) rather than block taps.
- **Tap and return model:** the payment-mode wording ("tap the cards at the bottom of the screen") supports the familiar pattern. The selected card moves to the top, and the rest collapse into a small stack at the bottom. Tapping that stack brings back the list. The motion details are unsourced (see Gaps).

### Gaps
- The exact overlap per card (points or %), how many cards show before scrolling, and whether the stack scrolls or rubber-bands. No Apple doc, HIG page, or reputable teardown I found measures these.
- The animation for tap → card lifts and others collapse to the bottom, and the return gesture (tapping the bottom stack vs. a Done/close button vs. swipe-down). Apple's guides only say "Tap an item". The search results that turned up were recreations: [Framer Wallet Card component](https://www.framer.com/marketplace/components/wallet-card/), [React Native Wallet animation (Level Up)](https://levelup.gitconnected.com/apple-wallet-animation-in-react-native-2faaf4dd10a4), and [AppCoda SwiftUI chapter](https://www.appcoda.com/learnswiftui/swiftui-advanced-animations.html). They aren't evidence of Apple's behavior.
- The order of the header buttons (+, Search, More), and whether the "Wallet" large title is still shown in iOS 26/27. Text sources name the buttons but not their order or position. Check against a device screenshot.

---

## 2. Card detail view: layout order and the "…" / Card Details menu

### Takeaway
On the official copy: tapping a card opens a detail view. It has the card art at top, a **rewards/balance line below the card** (where supported), and **recent activity further down the scroll** ("Latest Transactions" / "Latest Card Transactions", older items grouped by month and year). The controls are a **Card Number** button and a **More (…) or Info (ⓘ)** button. That button leads to options and **Card Details → Remove Card**. Third-party help pages put "…" / ⓘ in the **top-right corner**. Apple's text doesn't document the exact placement of Done/close, or the anatomy of a transaction row (icon, name, location, date, amount, chevron).

### Cited Findings
- **[iOS 27] What the detail view shows.** "Your passes, cards, and keys saved in Wallet may show useful details—such as the account balance, recent activity, reward or loyalty points, or flight information." — [Manage (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios)
- **[iOS 27] Transactions are below the card, reached by scrolling.** "Review your activity: On a supported card, scroll down to see recent activity. Some cards may show older transactions grouped by month and year." — [Manage (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios)
- **[iOS 27] Card Number button.** "On a payment card, tap [the Card Number button] to see the last four digits of the device account number (the number transmitted to the merchant when you use Apple Pay), the physical card number (if you added the card information for AutoFill), or the virtual card number (if supported)." — [Manage (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios)
- **[iOS 27] More / Info menu.** "Tap [the More button] or [the Info button], then choose an option. Depending on the type of card or pass, you can add funds to your account balance, adjust notification settings, contact the issuer for support, and more." — [Manage (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios)
- **[iOS 27] Removing a card.** "Tap the item you want to remove, then tap [the More button] or [the Info button]… Remove a debit or credit card: Tap Card Details, then tap Remove Card." For passes it's "Remove Pass" — [Manage (iOS 27)](https://support.apple.com/guide/iphone/manage-passes-cards-and-keys-iphbea35dbc4/27.0/ios)
- **[iOS 27] The Details toggles.** "Tap an item, tap [the More button] or [the Info button], then tap Details. Turn on…" lists:
  - **Express Mode**: "automatically selected when needed… without waking or unlocking your iPhone"
  - **Automatic Selection**: "automatically selected when requested by the reader"
  - **Suggest on Lock Screen**: "appears on the Lock Screen based on your time or location"

  Source: [Use passes, cards, and keys (iOS 27)](https://support.apple.com/guide/iphone/use-passes-cards-and-keys-iphe7aa3336/27.0/ios)
- **[older, iOS 12–16 era] Card Details contents.** It showed the last four digits of the card number and the Device Account Number, plus "change the billing address, turn the transaction history on or off, or remove the card", a Notifications toggle, and "Tap Transactions to view your recent history. To hide this information, turn off Transaction History." Note that authorized amounts can differ from the final charge: "a gas station may request an authorization of $99, even though you pumped only $25" — [iPhone User Guide, Manage cards and activity (iOS 15)](https://support.apple.com/guide/iphone/manage-cards-and-activity-iph7b666943a/15.0) (search-result excerpt; this page ID no longer resolves for iOS 26/27)
- **[iOS 26] Placement of ⓘ / "…" (third-party).**
  - "Tap a card, tap the info icon in the top-right corner, and choose 'Add Physical Card Information'… view the card number, expiration date, and CVV after authenticating" — [iGeeksBlog](https://www.igeeksblog.com/ios-26-wallet-app-new-features/)
  - A Finnish loyalty issuer: "Go to card details via the three dots in the top right corner. Turn off 'Automatic Selection'" — [S-Etukortti support](https://s-etukortti.fi/en/support/bonus-with-apple-wallet)
- **Rewards balance sits below the card.** "To see your rewards balance, tap on your supported card in the Wallet app. Your rewards balance is below your card… To see your latest redemptions all in one place, tap on the rewards balance on the front of your card." Also: "Purchases made using rewards will be labeled in your latest transactions history in Wallet." — [Pay with rewards, Apple Support 120479 (Sept 14 2026)](https://support.apple.com/en-us/120479)
- **Section header copy.**
  - Apple Account card: "Your recent purchase history appears under **Latest Transactions**. To view the details of a transaction, tap it." — [Apple Support 121154](https://support.apple.com/en-us/121154)
  - Apple Card: "Scroll down to **Latest Card Transactions** to see your purchases from the last month. To see older transactions, scroll down further to see previous months and years." and "To see details about a specific purchase, tap the transaction, then tap it again." — [Apple Card spending history, Apple Support 102329](https://support.apple.com/en-us/102329)
- **Apple Card detail has a bottom Search button and a "See All" link.** "Tap the Search button at the bottom of the screen to search by category, merchant, or location… If there are multiple transactions, tap See All next to Transactions." The transaction detail has a "Related Receipts" section, and you swipe left to remove a linked receipt — [Apple Support 102329](https://support.apple.com/en-us/102329)
- **Connected-account card in payment mode.** "you can quickly check the account balance and remaining credit by tapping the card. Tap the card again when you're ready to pay." — [Make purchases (iOS 27)](https://support.apple.com/guide/iphone/make-purchases-with-apple-pay-iphbd4cf42b4/27.0/ios)
- **[iOS 27] Insights** (spending across cards) exists, but MacRumors says it's limited to select territories, and in the US at least it isn't available despite appearing in some betas — [MacRumors iOS 27 Wallet guide](https://www.macrumors.com/guide/ios-27-wallet)

### Inferences
- **Layout order** that copies Apple, top to bottom:
  1. Top bar: close/Done on one side, "…" top-right
  2. Card art
  3. One-line status under the card (Apple uses rewards balance or available credit; CardMax can show points balance or "4× at this store")
  4. Section header "Latest Transactions"
  5. Rows
  6. "See All"
  This matches teammate feedback **(e)**.
- **The "…" menu for CardMax** can copy Apple's items: Card Number (last 4), Card Details (network, issuer, reward rates), Notifications, and a destructive Remove Card (confirmed with a second tap/alert). Apple shows Remove Card on the Card Details screen, not as a top-level menu item.
- **Feedback (f), pay control between card and transactions:** this matches where Apple puts in-store action buttons. "Pay In Full" / "Use Rewards" / "Pay Later" appear "below an eligible card" (Q3). Rewards balance also sits "below your card".

### Gaps
- **Transaction-row anatomy** (merchant logo/icon, name, location or "Apple Pay" subtitle, relative date like "Yesterday", amount, chevron). Apple's text and image alt text don't describe it ("An iPhone 16 Pro shows the Wallet app with the Latest Transactions for Apple Account" is the most detail given — [121154](https://support.apple.com/en-us/121154)). Verify from a screenshot.
- **Done/close button placement and glyph in iOS 26/27.** The guides don't say whether it's a "Done" text button or a Liquid Glass ✕/checkmark circle. For generic sheets, the HIG puts Cancel on the leading edge and Done on the trailing edge (Q5).
- The exact contents of the third-party issuer card "Card Details" screen in iOS 27. Only the older iOS 15-era list was available, plus "Remove Card".

---

## 3. In-store Apple Pay flow (double-click), payment sheet, Express Mode, and card suggestions

### Takeaway
The in-store flow, per official copy:
1. Double-click the side button.
2. The **default card appears**.
3. Authenticate (Face ID / Touch ID / passcode).
4. Optionally tap the **cards at the bottom of the screen** to switch.
5. Optionally tap **Pay In Full / Use Rewards / Pay Later** buttons shown **beneath the card**.
6. "Hold the top of your iPhone near the contactless reader until **Done or a checkmark** appears."

Apple does **not** choose a payment card by merchant or rewards. The default card is whichever is at the front of the stack. "Automatic Selection" (reader-requested passes), "Express Mode" (no authentication), and "Suggest on Lock Screen" (time/location, for passes) are the only automatic behaviors. Location-based card choice exists only as a patent. CardMax's "best card for this store" is its own feature, not a copy of Apple.

### Cited Findings
- **[iOS 27] Official steps.** "On an iPhone with Face ID: Double-click the side button… When your default card appears, authenticate with Face ID, Touch ID, or your passcode. To switch to a different card, tap the cards at the bottom of the screen, then choose another card… Hold the top of your iPhone near the contactless reader until Done or a checkmark appears on the screen." — [Make purchases with Apple Pay (iOS 27)](https://support.apple.com/guide/iphone/make-purchases-with-apple-pay-iphbd4cf42b4/27.0/ios)
- **Support article wording (Sept 14 2026).** "If prompted, authenticate with Face ID or enter your passcode to open Apple Wallet… Hold the top of your iPhone near the contactless reader until Done and a checkmark appear on the display." Note "Done **and** a checkmark" here vs. "Done **or** a checkmark" in the guide — [Apple Support 102626](https://support.apple.com/en-us/102626)
- **Haptic and sound, officially documented only for Apple Watch.** "Hold the display of your Apple Watch near the contactless reader until you feel a gentle tap and hear a beep." The Watch flow also says "Your default card opens automatically. Scroll down to choose another card." — [Apple Support 102626](https://support.apple.com/en-us/102626). For iPhone, only bank and issuer help pages mention the feedback. Per search-result summaries, a credit-union page mentions a vibration and a beep, and Visa's page mentions "Done" plus a beep. I didn't read either page in full ([TPCU](https://www.tpcu.on.ca/index/bank/ways-to-bank/apple-pay), [Visa](https://www.visa.com/en-kw/personal/technologies/contactless-payments/apple-pay)).
- **Web haptics on iPhone are limited (relevant to the CardMax PWA).** Safari doesn't implement the Vibration API (`navigator.vibrate`), so libraries fall back to a hack. They toggle a hidden `<input type="checkbox" switch>` (Safari 17.4+), which fires the Taptic Engine — [azukiazusa.dev](https://azukiazusa.dev/en/blog/ios-safari-web-haptics), [Ionic issue #29942](https://github.com/ionic-team/ionic-framework/issues/29942) ("a workaround for lack of support for Vibration API in Safari"). One source says Apple patched this in iOS 26.5, so programmatic haptics may no longer work on current iOS. That claim is unverified, single source — [kimsal.com, Mar 2026](https://kimsal.com/blog/2026/03/20/a-bit-of-feedback/).
- **[iOS 26+] In-store installment buttons beneath the card.** "Double-click the side button and tap the credit or debit card that you want to use. If your card is eligible, you'll see the option to tap Pay Later." The image alt text reads "'Pay In Full' and 'Pay Later' buttons on an eligible card during in-store checkout". Next steps are "Choose a Plan", "Planned Purchase Amount", or "Set Up After Purchase". In-store requires "an iPhone with iOS 26 or later" — [Apple Support 120477](https://support.apple.com/en-us/120477)
- **[iOS 26+] In-store rewards buttons beneath the card.** "If the card that you want to use is eligible, you'll see Use Rewards beneath the card. To apply your rewards balance to your transaction, tap Use Rewards. Then tap Choose Amount…" The alt text reads "'Pay In Full' and 'Use Rewards' buttons below an eligible card." Then "hold the top of your iPhone near the card reader until you see Done or a checkmark" — [Apple Support 120479](https://support.apple.com/en-us/120479). Settings toggles live under Apple Pay Defaults ("Available payment options: Turn on or off Pay Later, Rewards, Offers, and Other Pay Later Options") — [Make purchases (iOS 27)](https://support.apple.com/guide/iphone/make-purchases-with-apple-pay-iphbd4cf42b4/27.0/ios)
- **Location note.** "If you have Location Services turned on, the location of your iPhone at the time you make a payment may be sent to Apple and the card issuer to help prevent fraud." The location is used for fraud prevention, not card selection — [Make purchases (iOS 27)](https://support.apple.com/guide/iphone/make-purchases-with-apple-pay-iphbd4cf42b4/27.0/ios)
- **Automatic behaviors** (Express Mode / Automatic Selection / Suggest on Lock Screen): see the quotes in Q2 — [Use passes, cards, and keys (iOS 27)](https://support.apple.com/guide/iphone/use-passes-cards-and-keys-iphe7aa3336/27.0/ios). Also: "If Automatic Selection is turned on, double-click the side button… If prompted, authenticate" — same source.
- **[older, iOS 13/14] Rewards passes with payment.** In some stores the rewards card and payment card are applied in one step. In others you wait for the cashier or terminal to request payment, and "Apple Pay then switches to your default payment card." The older guide also says to hold the top of the phone "within a few centimeters" of the reader — [iPhone User Guide iOS 13](https://support.apple.com/en-asia/guide/iphone/make-contactless-payments-iphbd4cf42b4/13.0) (search excerpt)
- **Location-based card selection is a patent, not a shipped feature.** A 2021 Apple patent describes Apple Pay choosing a credential by location (e.g., a supermarket terminal triggering a rewards card) — [NFCW](https://www.nfcw.com/?p=71612). A rewards-app feature-request forum says third-party apps can't select a card in Apple Wallet — [MaxRewards feedback](https://feedback.maxrewards.com/feature-requests/p/apple-pay-connect) (user forum; secondary). I found no Apple source for a feature that suggests the best rewards card at a merchant.
- **Lock Screen suggestion (passes).** "When you provide information about when and where your pass is relevant, the system can display a link to it on the Lock Screen… a gym membership card could appear on the Lock Screen as people enter the gym." — [HIG: Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet)
- **Payment sheet (surface b, in-app/web), not the in-store screen.**
  - "Provide a business name after the word Pay on the same line as the total… For example, Pay [Business_Name]."
  - "Defer to the payment sheet for progress information during payment. The payment sheet already presents loading states and progress clearly. Additional spinners or progress indicators can create confusion."
  - "Report transaction results in the payment sheet."
  - After the sheet shows the result, display an order confirmation such as "1234 (Apple Pay)" or "Paid with Apple Pay."

  Source: [HIG: Apple Pay](https://developer.apple.com/design/human-interface-guidelines/apple-pay)
- **[older, iOS 11–11.3] Side-button confirmation on the payment sheet.** iOS 11 showed "Double Click to Pay" next to the side button, and users found it confusing. iOS 11.3 added a "Confirm with Side Button" instruction with a graphic at the bottom of the sheet — [Benjamin Mayo](https://bzamayo.com/confirm-with-side-button), [Michael Tsai](https://mjtsai.com/blog/2018/01/01/pressing-the-side-button-to-confirm-payments-on-iphone-x/) (commentary; describes the sheet, not the in-store screen)

### Inferences
- **Feedback (c) and (f), circular hold control between card and history:** this fits Apple's in-store anatomy. Apple puts payment-mode actions directly **beneath the selected card**.
- **A faithful CardMax pay sequence:**
  1. Card lifts to the top and the other cards drop to a bottom stack.
  2. A brief "authenticate" beat (a simulated Face ID glyph is optional).
  3. The prompt reads "Hold Near Reader" (wording unverified, see Gaps).
  4. Success shows a **checkmark plus "Done"**.
  5. Then a receipt.
- **Success feedback:** on iPhone, a web app has no reliable haptic channel (see the finding above). The success moment should rely on the checkmark animation plus an optional short chime. Treat any haptic as a bonus on Android or older iOS, and label the payment "simulated". AGENTS.md says the flow "must not claim to charge a card or contact a payment terminal".
- **"Why this card won" above the card (b):** Apple has no equivalent for this. The closest Apple pattern is a short hint line tied to the card ("Pay Later hint below your card", "Use Rewards hint under your card" — [120477](https://support.apple.com/en-us/120477), [120479](https://support.apple.com/en-us/120479)). A one-line reason chip next to the card, expandable for details, would read as Apple-like. A long explanation block wouldn't.

### Gaps
- **The exact on-screen copy before tapping** (e.g., "Hold Near Reader"). The only evidence I found is a VoiceOver user anecdote on [AppleVis](https://applevis.com/comment/114041). No Apple page states the string.
- **The authentication glyph** (Face ID animation) and the reader/contactless glyph.
- **Checkmark animation timing**, and how long "Done" stays before dismissing.
- **iPhone haptic and sound specs.** Only bank pages describe them.
- **iOS 27 "Tap to Share"** (customer phone to merchant iPhone) is mentioned by MacRumors only in passing — [MacRumors iOS 27 Wallet guide](https://www.macrumors.com/guide/ios-27-wallet)

---

## 4. Add-card flow: entry point and copy

### Takeaway
The entry point is the **Add Card** button on the Wallet home (the "+"). It opens a category picker, and for payment cards the copy is "Cards Found For You", "Debit or Credit Card", "Continue", "Tap or hold your card close to your iPhone to add it", and "Enter Card Details Manually". iOS 27 adds Create a Pass behind the same button.

### Cited Findings
- **Payment-card steps.** "In the Wallet app, tap the Add Card button. Tap Cards Found For You to add a card that you used previously. Tap Debit or Credit Card to add a new card. Tap Continue. Tap or hold your card close to your iPhone to add it. To manually add your card, tap Enter Card Details Manually and follow the onscreen instructions." — [Set up Apple Pay, Apple Support 108398](https://support.apple.com/en-us/108398)
- **Removing from Cards Found For You.** "tap Edit, tap the Remove button, and tap Delete. Then, tap Delete Card to confirm" — [Apple Support 108398](https://support.apple.com/en-us/108398). On Apple Watch: "If you're unable to add your card by tapping or holding it close to your iPhone, position your debit or credit card in the frame to scan it." — same source
- **[iOS 27] Generic flow.** "Tap [the Add Card button]. You may be asked to sign in to your Apple Account. Choose a category, then follow the onscreen instructions. This might include receiving a text message, answering security questions, or confirming through the card issuer's app." — [Set up (iOS 27)](https://support.apple.com/guide/iphone/set-up-cards-and-passes-iph9b7f53382/27.0/ios)
- **[iOS 26+] Pay Later Options** is another category under Add Card: "open the Wallet app, tap the Add Card button, then tap Pay Later Options" — [Apple Support 120477](https://support.apple.com/en-us/120477)
- **[iOS 27] Create a Pass.** Templates are Standard, Membership, and Event, with "12 background colors with texture options or seven custom backgrounds" — [MacRumors iOS 27 Wallet guide](https://www.macrumors.com/guide/ios-27-wallet)
- **The external entry point** is the "Add to Apple Wallet" button/badge in apps, emails, and web pages — [Set up (iOS 27)](https://support.apple.com/guide/iphone/set-up-cards-and-passes-iph9b7f53382/27.0/ios), [HIG: Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet)

### Inferences
- The CardMax "+" can open a sheet with "Add Card" (simulated), "Manage Cards", and so on. Follow Apple's verb-first labels ("Add Card", "Remove Card") and its two-step destructive confirmation ("Delete" → "Delete Card").

### Gaps
- The full category list on the iOS 27 Add Card picker (beyond Debit or Credit Card, Pay Later Options, Create a Pass, transit/ID). Not fully enumerated in any single fetched source.

---

## 5. Apple HIG guidance: Apple Pay, Wallet, buttons, sheets, materials (Liquid Glass)

### Takeaway
The HIG has three things that matter for CardMax:
- **Brand rules.** Don't imitate the Apple Pay button, logo, or name on a custom control.
- **Payment-sheet behavior.** Show the result in place, avoid extra spinners, then show a confirmation.
- **Liquid Glass.** Use it only for floating controls and navigation, never in the content layer. A card stack is content, so the "+", "…", and close buttons get glass and the cards don't.

### Cited Findings
- **Don't copy Apple Pay branding on custom controls.**
  - "Don't create custom Apple Pay button designs or try to replicate the Apple-provided ones."
  - "If you use a custom button to start the Apple Pay payment process, make sure your custom button doesn't display 'Apple Pay' or the Apple Pay logo."
  - The Apple Pay mark must not be altered, and you must not "flip, rotate, or animate the Apple Pay mark"
  - "never make it plural or possessive"

  Source: [HIG: Apple Pay](https://developer.apple.com/design/human-interface-guidelines/apple-pay)
- **Apple Pay button specs** (for reference): minimum 100×30 pt with margins of 1/10 of the button height. Styles are Black, White, and White with outline; use White on dark backgrounds. "By default, an Apple Pay button has rounded corners. You can change the corner radius to produce a button with square corners or a capsule-shape button." Change log: "June 8, 2026 | Refined guidance to reflect the latest Apple Pay appearance and capabilities." — [HIG: Apple Pay](https://developer.apple.com/design/human-interface-guidelines/apple-pay)
- **Error copy style.** "Use noun phrases with sentence-style capitalization and no ending punctuation. Aim to keep messages at 128 characters or fewer". Example: "Zip code doesn't match city." — [HIG: Apple Pay](https://developer.apple.com/design/human-interface-guidelines/apple-pay)
- **Where Liquid Glass belongs.** "Liquid Glass forms a distinct functional layer for controls and navigation elements… that floats above the content layer." "Don't use Liquid Glass in the content layer." "Use Liquid Glass effects sparingly… Limit these effects to the most important functional elements." — [HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- **Glass variants.** Regular "blurs and adjusts the luminosity of background content"; it's what most system components use. Clear is "highly translucent" and meant for use over media. "If the underlying content is bright, consider adding a dark dimming layer of 35% opacity." iOS also keeps four standard materials (ultra-thin, thin, regular, thick) for the content layer. Change log: Liquid Glass guidance added June 9, 2025 and updated Sept 9, 2025 — [HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- **Buttons.**
  - "a button needs a hit region of at least 44x44 pt"
  - "use a button that has a prominent visual style for the most likely action… Keep the number of prominent buttons to one or two per view"
  - "Use style — not size — to visually distinguish the preferred choice"

  Source: [HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons). The circle/capsule advice ("an icon-only button uses a circle shape"; "prefer circular or capsule-shape buttons") appears under the **visionOS** section of that page, so it isn't an iOS rule — same source.
- **Sheets.**
  - "In iOS and iPadOS, for sheets with a single view, the Cancel button belongs on the leading edge of the top toolbar. When present, the Done button belongs on the trailing edge."
  - "Support swiping to dismiss a sheet."
  - The detents are large and medium ("about half of the fully expanded height"), and you should "Include a grabber in a resizable sheet."
  - "Display only one sheet at a time."
  - "If you provide a Done button, always pair it with a Cancel button"

  Change log: "March 24, 2026 | Updated guidance for button placement." — [HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- **Pass anatomy.** Header fields stay visible when collapsed. The logo is 50 pt tall at the top-leading corner. Back fields "appear in pass details in Wallet". Keep the pass front uncluttered — [HIG: Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet)

### Inferences
- **On the CardMax dark theme:** make the header "+", "…", the close button, and the floating pay control translucent, blurred surfaces (the web stand-in for glass: `backdrop-filter: blur()` plus tint). Keep card art and the transaction list on opaque or standard-material surfaces.
- **One prominent action per view.** The hold-to-pay circle is that action. "Why this card won" and "See All" should be secondary-styled.
- **The pay control must not be labeled "Apple Pay"** or use Apple's mark. Use neutral copy such as "Hold to pay (simulated)". The product is a simulation and should not imitate Apple branding.
- **Card detail as a sheet:** on the web, model it as a full-height sheet with swipe-down to dismiss and a trailing "Done". This follows the HIG sheet conventions; it isn't verified Wallet behavior.

### Gaps
- No HIG page specifically covers the Wallet app's own card-stack UI. The Wallet HIG covers passes, orders, and identity for third-party developers.
- No Apple source describes Liquid Glass changes inside the Wallet app specifically, for iOS 26 or 27.

---

## 6. Teardowns, design breakdowns, and motion parameters (springs and durations)

### Takeaway
No reputable teardown with measured Wallet animation timings turned up. The best primary motion source is Apple's WWDC23 "Animate with springs", which defines the spring model iOS uses (perceptual duration plus bounce). It maps directly onto Motion for React's `visualDuration` and `bounce`, which the installed motion@14.0.0 supports.

### Cited Findings
- **Spring model.**
  - "It uses just 2 parameters: duration and bounce."
  - "the duration parameter is a perceptual duration that is chosen to be predictable and not move around, even as the other parameters of a spring change."
  - "we now use them as the default animation in SwiftUI"
  - "When you're not sure, use a spring with bounce 0, which is also what you get if you don't specify the bounce."

  Source: [WWDC23 "Animate with springs"](https://developer.apple.com/videos/play/wwdc2023/10158/)
- **Bounce guidance.**
  - "A bounce of 0 feels like a smooth, gradual change. A small bounce, like around 15%, doesn't feel very bouncy yet, but the long tail feels a little more brisk. And for larger bounce values like 30%, you do start to feel some noticeable bounciness."
  - "you should be cautious about using values higher than around 0.4, since they may feel too exaggerated for a UI element."
  - "Bounce can also make sense when you want an animation to feel more physical, like if it's going to be used at the end of a gesture."

  Source: [WWDC23 "Animate with springs"](https://developer.apple.com/videos/play/wwdc2023/10158/)
- **Gesture velocity.** "A spring can start with any initial velocity, so we get a natural feeling where our animation picks up right where the gesture ends." The session's Core Animation example is `CASpringAnimation(perceptualDuration: 0.6, bounce: 0.2)`. It also mentions built-in presets "based on spring values that are used in iOS" (`.snappy` is shown) — [WWDC23 "Animate with springs"](https://developer.apple.com/videos/play/wwdc2023/10158/)
- **Motion for React equivalent.** The installed `motion-dom` types (motion 14.0.0 in `frontend/node_modules`) define `visualDuration` as "a time, set in seconds, that the animation will take to visually appear to reach its target", and `bounce` as "`0` is no bounce, and `1` is extremely bouncy. Negative values, down to `-1`, make an overdamped spring". These are local type definitions, `/Users/naz/Documents/gh/QC-hack/frontend/node_modules/motion-dom/dist/index.d.ts`.
- **Recreations, not evidence of Apple's behavior.** Wallet-like stacks exist as a [Framer component](https://www.framer.com/marketplace/components/wallet-card/), [React Native write-ups](https://levelup.gitconnected.com/apple-wallet-animation-in-react-native-2faaf4dd10a4), an [AppCoda SwiftUI chapter](https://www.appcoda.com/learnswiftui/swiftui-advanced-animations.html), and UIKit layouts ([CardStackCollectionViewLayout](https://github.com/is0bnd/CardStackCollectionViewLayout)). Yelp's watchOS card stack offsets each card by its index — [Yelp Engineering](https://engineeringblog.yelp.com/2019/10/redesigning-yelp-for-apple-watch-with-swiftui.html).

### Inferences
- **Starting values for CardMax** (taken from the WWDC guidance, not measured from Wallet):
  - Card lift and expand, and the other cards collapsing: `{ type: "spring", visualDuration: ~0.4–0.5, bounce: 0–0.15 }`
  - Releasing a drag: `bounce: ~0.2` so it feels physical
  - Keep bounce at 0.4 or below
  - Use layout/shared-element animation (`layoutId`) so the tapped card morphs from its stack slot to the detail position
- **Hold-to-pay circle:** a progress ring that fills over a fixed hold time, then a checkmark draw. Apple publishes no timing, so the duration is a product decision.
- **Reduced motion:** honor `prefers-reduced-motion` by crossfading instead of springing (general accessibility practice; not from Apple sources here).

### Gaps
- No measured durations or spring constants for the Wallet card lift, the stack collapse, or the Done checkmark, from Apple or a reputable teardown.
- Mobbin, Page Flows, and ScreensDesign didn't come up with Apple Wallet flows in searches. Those libraries mostly index third-party apps, and their pages need a login, so I couldn't check them. A screen recording on a current iPhone is the reliable way to get the geometry and timing.
- I didn't find a WWDC session specifically on Wallet app animation.
