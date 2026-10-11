import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from '@base-ui/react/dialog'
import { CaretLeftIcon, NavigationArrowIcon, XIcon } from '@phosphor-icons/react'
import type { Card, Location, Transaction } from '../../types'
import type { Session } from '../../session'
import { useFrame } from '../../components/frame'
import { Money } from '../../components/Money'
import { CardFace, CardLift, ErrorNotice, GlassButton, MerchantMark, Row, StoreBadge } from '../../components/ui'
import { coinBurst } from '../../lib/coins'
import { celebrate } from '../../lib/confetti'
import { standing } from '../../lib/derive'
import { money, parseDollarsToCents } from '../../lib/format'
import { categoryLabel } from '../../lib/merchants'
import { playChime, playFanfare } from '../../lib/sound'
import { PayCircle } from './PayCircle'

const CARD_RATIO = 214 / 340
/** How much of each card in the pile shows: enough for its name and what it earns here. */
const STRIP = 40
// A card change is a swap in place, never a flight across the screen: the new card rises
// from the pile's direction while the old one sinks and fades, and the pile closes its gap.
const rise = { type: 'spring', duration: 0.42, bounce: 0.12 } as const
const sink = { duration: 0.16, ease: [0.4, 0, 1, 1] } as const
const slide = { type: 'spring', duration: 0.35, bounce: 0 } as const

/**
 * Pay, as its own screen, the way Apple Pay is separate from the Wallet app:
 * the best card for the store up top, hold to pay, the other cards in a pile
 * underneath to switch. Opened from the Pay button or the side button.
 */
export function PaySheet({
  open,
  onOpenChange,
  session,
  cardId = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  /** A card to present instead of the best one, e.g. the card just tapped in Wallet. */
  cardId?: string | null
}) {
  const frame = useFrame()
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const pay = (card: Card): Transaction | null => {
    const tx = session.payInStore(card.id)
    if (!tx) return null
    const streak = session.stats.streak + (tx.missed_cents === 0 ? 1 : 0)
    const milestone = tx.missed_cents === 0 && [3, 5, 10].includes(streak)
    playChime()
    if (milestone) setTimeout(playFanfare, 350)
    if (tx.missed_cents === 0) {
      celebrate({ colors: [card.glow, '#30D158', '#ffffff'], origin: { x: 0.5, y: 0.3 }, size: milestone ? 'big' : 'small' })
      coinBurst({ x: 0.5, y: 0.3 })
    }
    // Leave the check and what it earned up for a beat, then step out of the way like Apple Pay does.
    closeTimer.current = setTimeout(() => onOpenChange(false), 1800)
    return tx
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
        <Dialog.Portal container={frame}>
          {/* Phone: full screen. Laptop: a phone-sized panel in the middle of the window, over a dimmed backdrop. */}
          <Dialog.Backdrop className="fixed inset-0 z-40 hidden bg-black/55 transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 wide:block" />
          <div className="contents wide:pointer-events-none wide:fixed wide:inset-0 wide:z-40 wide:grid wide:place-items-center">
            <Dialog.Popup className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[oklch(0.14_0.006_265)] pt-[var(--sat)] text-white outline-none transition-[translate,opacity] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:duration-300 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:opacity-0 wide:pointer-events-auto wide:relative wide:inset-auto wide:h-[min(820px,calc(100dvh-48px))] wide:w-[400px] wide:rounded-[36px] wide:pt-4 wide:shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),inset_0_0_0_0.5px_rgb(255_255_255/0.1)]">
              <Dialog.Title className="sr-only">Pay</Dialog.Title>
              <PayView session={session} onPay={pay} cardId={cardId} />
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
    </Dialog.Root>
  )
}

function PayView({ session, onPay, cardId }: { session: Session; onPay: (card: Card) => Transaction | null; cardId: string | null }) {
  const [picking, setPicking] = useState(!session.store)
  const [selected, setSelected] = useState<string | null>(cardId ?? session.winnerCardId)
  const [paid, setPaid] = useState<Transaction | null>(null)
  const [width, setWidth] = useState(390)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // A new store (or a new total) presents its best card, like Apple Pay presenting the default card.
  // Not on open: a card asked for by tapping it in Wallet stays until the store or total changes.
  const seen = useRef({ storeId: session.storeId, winnerCardId: session.winnerCardId })
  useEffect(() => {
    if (seen.current.storeId === session.storeId && seen.current.winnerCardId === session.winnerCardId) return
    seen.current = { storeId: session.storeId, winnerCardId: session.winnerCardId }
    setSelected(session.winnerCardId)
  }, [session.storeId, session.winnerCardId])

  const card = session.cards.find((c) => c.id === selected) ?? session.cards[0] ?? null
  const others = session.cards.filter((c) => c.id !== card?.id)
  const cardH = Math.round((width - 32) * CARD_RATIO)

  return (
    <div ref={root} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
        {picking ? (
          session.store ? (
            <GlassButton label="Back" onClick={() => setPicking(false)}>
              <CaretLeftIcon size={20} weight="bold" />
            </GlassButton>
          ) : (
            <span />
          )
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setPicking(true)}
            aria-label={`Shopping at ${session.store?.merchant.name}. Change store`}
            className="n-glass flex h-11 min-w-0 items-center gap-2 rounded-full pl-3 pr-4 text-[15px] focus-visible:outline-2 focus-visible:outline-white/70"
          >
            <NavigationArrowIcon size={16} weight="fill" className="scale-x-[-1] text-[#0A84FF]" />
            <span className="truncate font-semibold">{session.store?.merchant.name}</span>
          </motion.button>
        )}
        {!picking && session.rec ? <AmountPill cents={session.rec.amount_cents} onChange={session.setAmountCents} /> : null}
        <span className="flex-1" />
        <Dialog.Close
          aria-label="Close"
          className="n-glass grid size-11 shrink-0 place-items-center rounded-full text-white/80 focus-visible:outline-2 focus-visible:outline-white/70"
        >
          <XIcon size={18} weight="bold" />
        </Dialog.Close>
      </div>

      {!picking && session.recError ? (
        <div className="px-4 pb-3">
          <ErrorNotice error={session.recError} onRetry={session.retryRec} />
        </div>
      ) : null}
      {!session.cards.length ? (
        <div className="grid flex-1 place-items-center px-8 pb-24 text-center">
          <div>
            <p className="text-[17px] font-semibold">No cards yet</p>
            <p className="pt-1 text-[15px] text-[rgba(235,235,245,0.6)]">Add a card in Wallet, then pay with it here.</p>
          </div>
        </div>
      ) : picking || !card ? (
        <StorePicker
          locations={session.locations}
          storeId={session.storeId}
          onPick={(id) => {
            session.setStoreId(id)
            setPicking(false)
          }}
        />
      ) : (
        <>
          <div className="relative mx-4 shrink-0" style={{ height: cardH }}>
            <AnimatePresence initial={false}>
              <motion.div
                key={card.id}
                // A light blur while the two overlap, so they read as one card changing, not two.
                initial={{ opacity: 0, y: 36, scale: 0.96, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: rise, transitionEnd: { filter: 'none' } }}
                exit={{ opacity: 0, y: 10, scale: 0.97, filter: 'blur(2px)', transition: sink }}
                className="absolute inset-0"
                style={{ borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}
              >
                <CardFace card={card} live />
              </motion.div>
            </AnimatePresence>
          </div>
          <motion.div key={card.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.06 }}>
            <Standing session={session} card={card} paid={paid} onUseBest={() => setSelected(session.winnerCardId)} />
          </motion.div>
          <div className="grid min-h-[140px] flex-1 place-items-center">
            <PayCircle key={card.id} cardName={card.name} disabled={standing(session.rec, session.evaluation(card.id)).kind === 'rejected'} onPaid={() => setPaid(onPay(card))} />
          </div>
          <Pile session={session} cards={others} cardH={cardH} onPick={setSelected} />
        </>
      )}
    </div>
  )
}

/** The checkout total. Tap to type a different one; the cards re-rank for it. */
function AmountPill({ cents, onChange }: { cents: number; onChange: (cents: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const commit = () => {
    const typed = parseDollarsToCents(text)
    if (typed !== null && typed <= 10_000_000 && typed !== cents) onChange(typed)
    setEditing(false)
  }
  if (editing) {
    return (
      <label className="n-glass flex h-11 shrink-0 items-center rounded-full pl-3.5 pr-3 text-[17px] focus-within:outline-2 focus-within:outline-white/70">
        <span aria-hidden className="text-[rgba(235,235,245,0.6)]">$</span>
        <input
          autoFocus
          aria-label="Checkout total in dollars"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              e.stopPropagation()
              setEditing(false)
            }
          }}
          className="w-[6ch] bg-transparent font-semibold tabular-nums text-white outline-none"
        />
      </label>
    )
  }
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        setText((cents / 100).toFixed(2))
        setEditing(true)
      }}
      aria-label={`Checkout total ${money(cents)}. Change it`}
      className="n-glass h-11 shrink-0 rounded-full px-3.5 text-[15px] font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-white/70"
    >
      {money(cents)}
    </motion.button>
  )
}

function Standing({ session, card, paid, onUseBest }: { session: Session; card: Card; paid: Transaction | null; onUseBest: () => void }) {
  const st = standing(session.rec, session.evaluation(card.id))
  const muted = 'text-[rgba(235,235,245,0.6)]'
  return (
    <div className="flex min-h-[72px] flex-col items-center justify-center px-6 pt-4 text-center text-[17px]" aria-live="polite">
      {paid ? (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', duration: 0.35, bounce: 0 }}>
          <span className="font-[family-name:var(--font-sf-rounded)] text-[22px] font-bold text-[#30D158]">+{money(paid.earned_cents)} back</span>
          {paid.missed_cents ? <span className={muted}> · {money(paid.missed_cents)} missed</span> : null}
        </motion.p>
      ) : st.kind === 'best' ? (
        <p>
          <span className="font-[family-name:var(--font-sf-rounded)] font-bold text-[#30D158]">
            +<Money cents={st.value} /> back
          </span>
          <span className={muted}> · Best card here</span>
        </p>
      ) : st.kind === 'behind' ? (
        <>
          <p>
            <span className="font-semibold">{st.bestName}</span> earns <span className="font-semibold tabular-nums">{money(st.behindBy)}</span> more
          </p>
          <button type="button" onClick={onUseBest} className="min-h-11 text-[15px] text-[#0A84FF]">
            Use {st.bestName}
          </button>
        </>
      ) : st.kind === 'rejected' ? (
        <>
          <p className="font-semibold">{st.reason}</p>
          <button type="button" onClick={onUseBest} className="min-h-11 text-[15px] text-[#0A84FF]">
            Use the best card
          </button>
        </>
      ) : null}
    </div>
  )
}

/** The other cards, stacked at the bottom edge with their top strips showing. Tap one to pay with it. */
function Pile({ session, cards, cardH, onPick }: { session: Session; cards: Card[]; cardH: number; onPick: (id: string) => void }) {
  return (
    <div className="relative mx-4 shrink-0" style={{ height: cards.length * STRIP + 28 }}>
      <AnimatePresence initial={false}>
        {cards.map((c, i) => {
          const ev = session.evaluation(c.id)
          return (
            <motion.button
              key={c.id}
              layout="position"
              type="button"
              onClick={() => onPick(c.id)}
              aria-label={`Pay with ${c.name} ending ${c.last4}${ev ? (ev.accepted ? (ev.value_cents ? `, earns ${money(ev.value_cents)} here` : ', earns nothing here') : ', not accepted here') : ''}`}
              whileHover="lift"
              whileTap={{ scale: 0.985 }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: sink }}
              transition={slide}
              className="absolute inset-x-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              style={{ top: i * STRIP, height: cardH, zIndex: i, borderRadius: 16 }}
            >
              <CardLift>
                <CardFace card={c} badge={ev ? <StoreBadge ev={ev} best={session.winnerCardId === c.id} /> : undefined} />
              </CardLift>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function StorePicker({ locations, storeId, onPick }: { locations: Location[]; storeId: string | null; onPick: (id: string) => void }) {
  const sorted = [...locations].sort((a, b) => a.distance_m - b.distance_m)
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--sab)+16px)] [scrollbar-width:none]">
      <h2 className="px-1 pb-1 pt-2 font-[family-name:var(--font-sf-rounded)] text-[28px] font-bold leading-[34px]">Where are you shopping?</h2>
      <p className="px-1 pb-4 text-[15px] text-[rgba(235,235,245,0.6)]">We'll put the best card for that store on top.</p>
      <div className="n-panel overflow-hidden rounded-[20px]">
        {sorted.map((l, i) => (
          <Row
            key={l.id}
            leading={<MerchantMark id={l.merchant.id} name={l.merchant.name} size={32} />}
            title={l.merchant.name}
            subtitle={`${categoryLabel[l.merchant.category] ?? l.merchant.category_label} · ${l.distance_m} m`}
            trailing={l.id === storeId ? <span className="text-[15px] text-[#0A84FF]">Here</span> : undefined}
            onClick={() => onPick(l.id)}
            last={i === sorted.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
