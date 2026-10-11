import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Menu } from '@base-ui/react/menu'
import { CaretLeftIcon, DotsThreeIcon, NavigationArrowIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import Tilt from 'react-parallax-tilt'
import { TextMorph } from 'torph/react'
import type { Card } from '../../types'
import type { Session } from '../../session'
import { useFrame, useLayout } from '../../components/frame'
import { CardFace, CardLift, earnLabel, Emoji, ErrorNotice, GlassButton, LargeTitle, Loading, MerchantMark, Row, Section, StoreBadge } from '../../components/ui'
import { money, relativeDay } from '../../lib/format'
import { HereTiles } from './HereTiles'
import { AddCardSheet, CardDetailsSheet, ConfirmRemoveSheet, StoreSheet, WhySheet } from './sheets'

const CARD_RATIO = 214 / 340
const STRIP = 58
/** Laptop: the card stack's column width. */
const WIDE_STACK_W = 400
const cardSpring = { type: 'spring', duration: 0.55, bounce: 0.14 } as const

type SheetName = 'store' | 'why' | 'add' | 'details' | 'remove' | null

/**
 * The Wallet app half of Apple Wallet: your cards, and each card's purchases.
 * Paying is its own screen (PaySheet), opened from the Pay button beside the tab bar or the side button.
 * Phone: tap a card to open it. Laptop: the stack on the left, the chosen card's purchases beside it.
 */
export function WalletScreen({ session, width, onPayWith }: { session: Session; width: number; onPayWith: (cardId: string) => void }) {
  const wide = useLayout() === 'wide'
  const cardW = (wide ? WIDE_STACK_W : width) - 32
  const cardH = Math.round(cardW * CARD_RATIO)
  const [presented, setPresentedRaw] = useState<string | null>(null)
  // Cards tapped in the stack morph into place (shared layoutId). A card just added rises in instead.
  const [morph, setMorph] = useState(false)
  const setPresented = (id: string | null, fromStack = false) => {
    setMorph(fromStack)
    setPresentedRaw(id)
  }
  const [sheet, setSheet] = useState<SheetName>(null)

  const presentedCard = session.cards.find((c) => c.id === presented) ?? null
  const cardsById = useMemo(() => Object.fromEntries(session.cards.map((c) => [c.id, c])), [session.cards])
  // Laptop: some card is always open beside the stack; the best one here unless you pick another.
  const openCard = wide ? (presentedCard ?? session.cards.find((c) => c.id === session.winnerCardId) ?? session.cards[0] ?? null) : presentedCard

  const sheets = (
    <>
      <StoreSheet
        open={sheet === 'store'}
        onOpenChange={(o) => setSheet(o ? 'store' : null)}
        locations={session.locations}
        detection={session.detection}
        storeId={session.storeId}
        onPick={(id) => {
          session.setStoreId(id)
          setSheet(null)
        }}
      />
      <WhySheet open={sheet === 'why'} onOpenChange={(o) => setSheet(o ? 'why' : null)} rec={session.rec} cardsById={cardsById} />
      <AddCardSheet
        open={sheet === 'add'}
        onOpenChange={(o) => setSheet(o ? 'add' : null)}
        onAdd={async (type, last4) => {
          const c = await session.addCard(type, last4)
          setTimeout(() => setPresented(c.id), 350)
        }}
      />
      <CardDetailsSheet open={sheet === 'details'} onOpenChange={(o) => setSheet(o ? 'details' : null)} card={openCard} />
      <ConfirmRemoveSheet
        open={sheet === 'remove'}
        onOpenChange={(o) => setSheet(o ? 'remove' : null)}
        card={openCard}
        onRemove={async () => {
          if (openCard) await session.removeCard(openCard.id)
          setPresented(null)
          setSheet(null)
        }}
      />
    </>
  )

  const addButton = (
    <GlassButton label="Add card" onClick={() => setSheet('add')}>
      <PlusIcon size={22} weight="bold" />
    </GlassButton>
  )

  if (wide) {
    return (
      <div className="pb-16">
        <LargeTitle right={addButton}>Wallet</LargeTitle>
        {!session.cardsLoaded ? (
          <div className="px-4">{session.loadError ? <ErrorNotice error={session.loadError} onRetry={session.retryLoad} /> : <Loading label="Loading your wallet…" />}</div>
        ) : (
          <div className="grid items-start gap-6 pt-2" style={{ gridTemplateColumns: `${WIDE_STACK_W}px minmax(0, 1fr)` }}>
            <div>
              <StoreChip session={session} onOpen={() => setSheet('store')} />
              {session.recError ? (
                <div className="px-4 pb-4">
                  <ErrorNotice error={session.recError} onRetry={session.retryRec} />
                </div>
              ) : null}
              <Stack cards={session.cards} cardH={cardH} session={session} selectedId={openCard?.id ?? null} onPresent={(id) => setPresented(id)} />
            </div>
            {openCard ? (
              <div key={openCard.id}>
                <div className="flex items-center justify-between gap-3 px-4 pb-1">
                  <div className="min-w-0">
                    <h2 className="truncate font-[family-name:var(--font-sf-rounded)] text-[28px] font-bold leading-[34px]">{openCard.name}</h2>
                    <p className="text-[15px] text-[rgba(235,235,245,0.6)]">
                      {openCard.issuer} · •••• {openCard.last4}
                    </p>
                  </div>
                  <CardMenu onDetails={() => setSheet('details')} onRemove={() => setSheet('remove')} />
                </div>
                <DetailBody card={openCard} session={session} onWhy={() => setSheet('why')} onPick={() => setSheet('store')} />
              </div>
            ) : null}
          </div>
        )}
        {sheets}
      </div>
    )
  }

  return (
    <LayoutGroup>
      <div className="pb-32">
        <AnimatePresence mode="popLayout" initial={false}>
          {presentedCard ? (
            <motion.div key="detail-head" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <div className="flex items-center justify-between px-4 pb-3 pt-1">
                {/* A back button, not "Done": you browse a card's history, there's nothing to finish. */}
                <motion.button
                  type="button"
                  aria-label="Back to Wallet"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPresented(null)}
                  className="n-glass flex h-11 items-center gap-1 rounded-full pl-3 pr-4 text-[17px] font-semibold focus-visible:outline-2 focus-visible:outline-white/70"
                >
                  <CaretLeftIcon size={18} weight="bold" />
                  Wallet
                </motion.button>
                <CardMenu onDetails={() => setSheet('details')} onRemove={() => setSheet('remove')} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="home-head" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <LargeTitle right={addButton}>Wallet</LargeTitle>
            </motion.div>
          )}
        </AnimatePresence>

        {!session.cardsLoaded ? (
          <div className="px-4">{session.loadError ? <ErrorNotice error={session.loadError} onRetry={session.retryLoad} /> : <Loading label="Loading your wallet…" />}</div>
        ) : presentedCard ? (
          <Detail
            key={presentedCard.id}
            morph={morph}
            card={presentedCard}
            cardH={cardH}
            session={session}
            onWhy={() => setSheet('why')}
            onPick={() => setSheet('store')}
            onPay={() => onPayWith(presentedCard.id)}
          />
        ) : (
          <>
            <StoreChip session={session} onOpen={() => setSheet('store')} />
            {session.recError ? (
              <div className="px-4 pb-4">
                <ErrorNotice error={session.recError} onRetry={session.retryRec} />
              </div>
            ) : null}
            <Stack cards={session.cards} cardH={cardH} session={session} onPresent={(id) => setPresented(id, true)} />
          </>
        )}
      </div>

      {sheets}
    </LayoutGroup>
  )
}

function StoreChip({ session, onOpen }: { session: Session; onOpen: () => void }) {
  const { store, rec } = session
  return (
    <div className="flex items-center gap-2 px-4 pb-4">
      <motion.button
        type="button"
        layout="position"
        whileTap={{ scale: 0.97 }}
        onClick={onOpen}
        className="n-glass flex h-11 min-w-0 items-center gap-2 rounded-full pl-3 pr-4 text-[15px] focus-visible:outline-2 focus-visible:outline-white/70"
      >
        <NavigationArrowIcon size={16} weight="fill" className={store ? 'scale-x-[-1] text-[#0A84FF]' : 'scale-x-[-1] text-white/40'} />
        {store && rec ? (
          <span className="flex min-w-0 items-baseline">
            <TextMorph className="font-semibold">{store.merchant.name}</TextMorph>
            <span className="whitespace-pre text-[rgba(235,235,245,0.6)]"> · </span>
            <TextMorph className="text-[rgba(235,235,245,0.6)] tabular-nums">{money(rec.amount_cents)}</TextMorph>
          </span>
        ) : (
          <span className="text-[rgba(235,235,245,0.6)]">Where are you shopping?</span>
        )}
      </motion.button>
      {store ? (
        <motion.button
          type="button"
          aria-label="Leave store"
          whileTap={{ scale: 0.92 }}
          onClick={() => session.setStoreId(null)}
          className="n-glass grid size-11 place-items-center rounded-full text-white/70 focus-visible:outline-2 focus-visible:outline-white/70"
        >
          <XIcon size={16} weight="bold" />
        </motion.button>
      ) : null}
    </div>
  )
}

function Stack({
  cards,
  cardH,
  session,
  selectedId = null,
  onPresent,
}: {
  cards: Card[]
  cardH: number
  session: Session
  /** Laptop: the card open beside the stack. */
  selectedId?: string | null
  onPresent: (id: string) => void
}) {
  const height = (cards.length - 1) * STRIP + cardH
  // The best card here rides to the top of the stack. With no store, the cards fall back to your own order.
  // Leaving the previous best on top until the next ranking lands keeps a store change to one slide.
  const [top, setTop] = useState<string | null>(() => (session.storeId ? session.winnerCardId : null))
  // The cards in flight, and the one that was fully showing in front when they set off.
  const [moving, setMoving] = useState<{ ids: string[]; front: string | null }>({ ids: [], front: null })
  const stacked = (leadId: string | null) => {
    const lead = cards.find((c) => c.id === leadId)
    return lead ? [lead, ...cards.filter((c) => c !== lead)] : cards
  }
  const want = session.storeId ? (session.winnerCardId ?? top) : null
  if (want !== top) {
    const before = stacked(top)
    setTop(want)
    setMoving({ ids: [top, want].filter((id): id is string => id !== null), front: before[before.length - 1]?.id ?? null })
  }
  useEffect(() => {
    if (!moving.ids.length) return
    const t = setTimeout(() => setMoving({ ids: [], front: null }), 700)
    return () => clearTimeout(t)
  }, [moving])
  const ordered = stacked(top)
  if (!cards.length) {
    return (
      <div className="n-panel mx-4 grid place-items-center rounded-[20px] px-6 py-12 text-center">
        <Emoji name="credit-card" size={64} className="mb-3" />
        <p className="text-[17px] font-semibold">No cards yet</p>
        <p className="pt-1 text-[15px] text-[rgba(235,235,245,0.6)]">Add the cards you carry and we'll pick the best one at every store.</p>
      </div>
    )
  }
  return (
    <div className="relative mx-4" style={{ height }}>
      {ordered.map((c, i) => {
        const ev = session.evaluation(c.id)
        const isBest = session.winnerCardId === c.id
        // A card on the move rides above the others and shows only its top strip, so its body
        // never covers the strips it passes; the clip's overscan keeps the shadow. Only the
        // front card, whose body was showing, narrows to its strip as it goes.
        const travelling = moving.ids.includes(c.id)
        const narrows = travelling && moving.front === c.id
        return (
          <motion.button
            key={c.id}
            layoutId={`n-card-${c.id}`}
            type="button"
            aria-label={`${c.name} ending ${c.last4}${ev ? (ev.accepted ? (ev.value_cents ? `, earns ${money(ev.value_cents)} here` : ', earns nothing here') : ', not accepted here') : ''}`}
            aria-pressed={selectedId !== null ? selectedId === c.id : undefined}
            onClick={() => onPresent(c.id)}
            initial={false}
            animate={{ clipPath: travelling ? `inset(-24px -24px ${cardH - STRIP}px -24px)` : 'inset(-24px -24px -24px -24px)' }}
            whileHover="lift"
            whileTap={{ scale: 0.985 }}
            transition={travelling && !narrows ? { ...cardSpring, clipPath: { duration: 0 } } : cardSpring}
            className="absolute inset-x-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            style={{ top: i * STRIP, height: cardH, zIndex: travelling ? ordered.length + i : i, borderRadius: 16 }}
          >
            <CardLift>
              <CardFace card={c} badge={ev ? <StoreBadge ev={ev} best={isBest} /> : undefined} />
              {selectedId === c.id ? <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[16px] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.85)]" /> : null}
            </CardLift>
          </motion.button>
        )
      })}
    </div>
  )
}

function Detail({
  morph,
  card,
  cardH,
  session,
  onWhy,
  onPick,
  onPay,
}: {
  morph: boolean
  card: Card
  cardH: number
  session: Session
  onWhy: () => void
  onPick: () => void
  onPay: () => void
}) {
  return (
    <div>
      <div className="relative mx-4" style={{ height: cardH }}>
        {/* Tapping the opened card presents it for payment, the way a card in Apple Wallet does. */}
        <motion.button
          type="button"
          aria-label={`Pay with ${card.name} ending ${card.last4}`}
          onClick={onPay}
          layoutId={morph ? `n-card-${card.id}` : undefined}
          initial={morph ? false : { y: 420, scale: 0.96 }}
          animate={{ y: 0, scale: 1 }}
          whileTap={{ scale: 0.985 }}
          transition={cardSpring}
          className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          style={{ borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}
        >
          {/* Tilt sits inside the layoutId element: both write transform, so never on the same node. */}
          <Tilt
            className="h-full w-full"
            tiltMaxAngleX={8}
            tiltMaxAngleY={10}
            perspective={900}
            transitionSpeed={1200}
            glareEnable
            glareMaxOpacity={0.3}
            glareColor="#ffffff"
            glarePosition="all"
            glareBorderRadius="16px"
          >
            <CardFace card={card} live />
          </Tilt>
        </motion.button>
      </div>

      <DetailBody card={card} session={session} onWhy={onWhy} onPick={onPick} delay={0.12} />
    </div>
  )
}

/** Under an opened card: what it earns here, and its purchases. */
function DetailBody({ card, session, onWhy, onPick, delay = 0 }: { card: Card; session: Session; onWhy: () => void; onPick: () => void; delay?: number }) {
  const txs = useMemo(() => session.historyFor(card.id).slice(0, 12), [session, card.id])
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', duration: 0.4, bounce: 0, delay }}>
      <HereTiles session={session} card={card} onWhy={onWhy} onPick={onPick} />

      <Section title="Latest Transactions">
        {txs.length ? (
          txs.map((t, i) => (
            <motion.div key={t.id} layout="position" initial={t.id.startsWith('preview-') ? { opacity: 0, y: -10 } : false} animate={{ opacity: 1, y: 0 }}>
              <Row
                leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} />}
                title={t.merchant_name}
                subtitle={`${relativeDay(t.ts)} · ${t.channel === 'store' ? 'In store' : 'Online'}`}
                trailing={
                  <div className="tabular-nums">
                    <div className="text-[17px]">{money(t.amount_cents)}</div>
                    {/* What the purchase earned. What it missed lives on the Rewards tab, not in a card's history. */}
                    <div className={`text-[13px] ${t.earned_cents ? 'text-[#30D158]' : 'text-[rgba(235,235,245,0.6)]'}`}>{earnLabel(t.earned_cents)}</div>
                  </div>
                }
                last={i === txs.length - 1}
              />
            </motion.div>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-[17px] font-semibold">No purchases yet</p>
            <p className="pt-1 text-[15px] text-[rgba(235,235,245,0.6)]">Payments with {card.name} show up here.</p>
          </div>
        )}
      </Section>
    </motion.div>
  )
}

function CardMenu({ onDetails, onRemove }: { onDetails: () => void; onRemove: () => void }) {
  const frame = useFrame()
  const item =
    'flex h-11 cursor-default items-center justify-between gap-6 px-4 text-[17px] outline-none data-highlighted:bg-white/10 select-none'
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="More"
        className="n-glass grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-white/70"
      >
        <DotsThreeIcon size={24} weight="bold" />
      </Menu.Trigger>
      <Menu.Portal container={frame}>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup className="n-sheet min-w-[220px] origin-[var(--transform-origin)] overflow-hidden rounded-[20px] py-1 text-white outline-none transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0">
            <Menu.Item className={item} onClick={onDetails}>
              Card details
            </Menu.Item>
            <Menu.Separator className="h-[0.5px] bg-white/15" />
            <Menu.Item className={`${item} text-[#FF453A]`} onClick={onRemove}>
              Remove card
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
