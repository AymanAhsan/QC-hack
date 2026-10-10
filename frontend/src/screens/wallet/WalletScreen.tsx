// Wallet: the in-store flow. Owner: Yousef.
//
//   idle ──(pick store)──► located ──(press & hold)──► scan ──600 ms──► read
//                            ▲   ▲                       │ release        │ 1,000 ms after press
//                            │   └───────────────────────┘ cancels        ▼
//                            └──(done)── receipt ◄──900 ms── success (chime, vibrate, POST)
//
// GET /api/wallet + /api/locations on mount, GET /api/recommend per store,
// POST /api/transactions on success. Payments are simulated only.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { api, newIdempotencyKey } from '../../api'
import { useNav } from '../../navigation'
import type { Card, Location, RecommendResponse } from '../../types'
import { formatCents, parseDollarsToCents } from '../../lib/format'
import { DemoBadge, ErrorNotice, Loading, ScreenHeader } from '../../components/ui'
import { WalletCard } from './WalletCard'
import { WhyDrawer } from './WhyDrawer'
import { PayButton } from './PayButton'
import { Receipt, type ReceiptData } from './Receipt'
import { StorePicker } from './StorePicker'
import { CardManager } from './CardManager'
import { playChime, unlockAudio, vibrateSuccess, vibrateTick } from './feedback'
import { HANDSHAKE_MS, READ_DURATION_MS, RECEIPT_DELAY_MS } from './timing'

export type PayPhase = 'idle' | 'located' | 'scan' | 'read' | 'success' | 'receipt'


// Deck geometry. Card size follows the available width, capped at 340 px.
const MAX_CARD_W = 340
const CARD_RATIO = 0.63
const LOSER_GAP = 22 // between the lifted winner and the loser stack
const LOSER_PEEK = 42 // visible strip of each loser: enough to read its name
const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(MAX_CARD_W)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function WalletScreen() {
  const nav = useNav()
  const [cards, setCards] = useState<Card[] | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loadError, setLoadError] = useState<unknown>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [managerOpen, setManagerOpen] = useState(false)

  const [rec, setRec] = useState<RecommendResponse | null>(null)
  const [recError, setRecError] = useState<unknown>(null)
  const [arriving, setArriving] = useState<Location | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [phase, setPhaseState] = useState<PayPhase>('idle')
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [amountText, setAmountText] = useState('')

  // Timer callbacks read the live phase from here, not from a stale closure.
  const phaseRef = useRef<PayPhase>('idle')
  const setPhase = (next: PayPhase) => {
    phaseRef.current = next
    setPhaseState(next)
  }
  const timers = useRef<number[]>([])
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const recAbort = useRef<AbortController | null>(null)
  const purchase = useRef<{ key: string; rec: RecommendResponse } | null>(null)

  const [deckRef, deckWidth] = useWidth<HTMLDivElement>()
  const cardW = Math.min(MAX_CARD_W, Math.floor(deckWidth))
  const cardH = Math.round(cardW * CARD_RATIO)
  const idleStep = Math.round(cardH * 0.26)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoadError(null)
    Promise.all([api.wallet(ctrl.signal), api.locations(ctrl.signal)]).then(
      ([w, l]) => {
        setCards(w.cards)
        setLocations(l.locations)
      },
      (e) => !ctrl.signal.aborted && setLoadError(e),
    )
    return () => ctrl.abort()
  }, [loadAttempt])

  useEffect(
    () => () => {
      clearTimers()
      recAbort.current?.abort()
    },
    [],
  )

  // ── Location ──────────────────────────────────────────────────────

  const arriveAt = (loc: Location, amountCents?: number) => {
    setPickerOpen(false)
    clearTimers()
    recAbort.current?.abort()
    const ctrl = new AbortController()
    recAbort.current = ctrl
    setArriving(loc)
    setRecError(null)
    api.recommend(loc.id, amountCents, ctrl.signal).then(
      (r) => {
        setRec(r)
        setAmountText((r.amount_cents / 100).toFixed(2))
        setReceipt(null)
        setPhase('located')
        setArriving(null)
      },
      (e) => {
        if (ctrl.signal.aborted) return
        setRecError(e)
        setArriving(null)
      },
    )
  }

  // Mock purchase amount: re-rank the wallet for the typed checkout total.
  const commitAmount = () => {
    if (!rec) return
    const cents = parseDollarsToCents(amountText)
    if (cents === null || cents > 10_000_000) {
      setAmountText((rec.amount_cents / 100).toFixed(2))
      return
    }
    if (cents === rec.amount_cents) return
    const loc = locations.find((l) => l.id === rec.merchant.id)
    if (loc) arriveAt(loc, cents)
  }

  const leaveStore = () => {
    clearTimers()
    recAbort.current?.abort()
    setArriving(null)
    setRec(null)
    setReceipt(null)
    setRecError(null)
    setPhase('idle')
  }

  // ── Purchase logging ──────────────────────────────────────────────

  const save = useCallback(
    async (key: string, r: RecommendResponse) => {
      setReceipt((prev) => prev && { ...prev, save: { status: 'saving' } })
      try {
        const { transaction } = await api.createTransaction({
          idempotency_key: key,
          merchant_id: r.merchant.id,
          subtotal_cents: r.amount_cents,
          card_used_id: r.winner_card_id!,
          channel: 'store',
          source: 'wallet',
        })
        // Server values are authoritative
        setReceipt((prev) =>
          prev && { ...prev, points: transaction.points_earned, valueCents: transaction.earned_cents, save: { status: 'saved' } },
        )
        nav.notifyTransactionLogged()
      } catch (error) {
        setReceipt((prev) => prev && { ...prev, save: { status: 'failed', error } })
      }
    },
    [nav],
  )

  // ── Hold-to-pay state machine ─────────────────────────────────────

  const holdStart = () => {
    const r = rec
    if (phaseRef.current !== 'located' || !r?.winner_card_id) return
    unlockAudio()
    vibrateTick()
    setPhase('scan')
    later(() => {
      if (phaseRef.current !== 'scan') return
      setPhase('read')
      later(() => {
        if (phaseRef.current !== 'read') return
        setPhase('success')
        playChime()
        vibrateSuccess()

        const winner = r.ranking.find((e) => e.card_id === r.winner_card_id)!
        setReceipt({
          cardName: winner.card_name,
          merchantName: r.merchant.name,
          amountCents: r.amount_cents,
          points: winner.points,
          valueCents: winner.value_cents,
          save: { status: 'saving' },
        })
        // One key per purchase; Retry reuses it so the server never double-logs.
        purchase.current = { key: newIdempotencyKey(), rec: r }
        void save(purchase.current.key, r)
        later(() => phaseRef.current === 'success' && setPhase('receipt'), RECEIPT_DELAY_MS)
      }, READ_DURATION_MS)
    }, HANDSHAKE_MS)
  }

  const holdEnd = () => {
    // Releasing before success cancels back to located
    if (phaseRef.current === 'scan' || phaseRef.current === 'read') {
      clearTimers()
      setPhase('located')
    }
  }

  const dismissReceipt = () => {
    clearTimers()
    setReceipt(null)
    setPhase('located')
  }

  // ── Render ────────────────────────────────────────────────────────

  if (!cards) {
    return (
      <section aria-label="Wallet">
        <ScreenHeader title="Wallet" subtitle={<DemoBadge>Simulated payments · demo cards</DemoBadge>} />
        {loadError ? <ErrorNotice error={loadError} onRetry={() => setLoadAttempt((n) => n + 1)} /> : <Loading label="Loading your wallet…" />}
      </section>
    )
  }

  const located = phase !== 'idle' && rec !== null
  const winnerId = located ? rec.winner_card_id : null
  const evalById = new Map(rec?.ranking.map((e) => [e.card_id, e]) ?? [])
  const losers = located ? rec.ranking.filter((e) => e.card_id !== winnerId) : []
  const lifted = phase === 'read' || phase === 'success' || phase === 'receipt'
  const busy = phase === 'scan' || phase === 'read' || phase === 'success'

  const deckHeight = cards.length === 0 ? 0 : !located
    ? (cards.length - 1) * idleStep + cardH
    : winnerId
      ? cardH + LOSER_GAP + losers.length * LOSER_PEEK
      : losers.length * LOSER_PEEK + cardH - LOSER_PEEK

  const slot = (card: Card, idleIndex: number) => {
    if (!located) return { y: idleIndex * idleStep, scale: 1, dim: 1, z: idleIndex + 1 }
    if (card.id === winnerId) return { y: lifted ? -12 : 0, scale: 1.05, dim: 1, z: 100 }
    const i = losers.findIndex((e) => e.card_id === card.id)
    const top = winnerId ? cardH + LOSER_GAP : 0
    // Dim with brightness rather than opacity so stacked cards stay opaque
    return { y: top + i * LOSER_PEEK, scale: winnerId ? 0.94 : 1, dim: 0.4, z: i + 1 }
  }

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Wallet" className="flex min-h-full flex-col">
        <ScreenHeader title="Wallet" subtitle={<DemoBadge>Simulated payments · demo cards</DemoBadge>} />

        <button type="button" disabled={busy || phase === 'receipt'} onClick={() => {
          leaveStore()
          setManagerOpen((open) => !open)
        }} className="mb-4 self-start rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-50">Manage cards</button>

        {managerOpen && <CardManager cards={cards} onClose={() => setManagerOpen(false)} onChange={async () => {
          leaveStore()
          const wallet = await api.wallet()
          setCards(wallet.cards)
        }} />}

        {cards.length === 0 && <p className="mb-4 rounded-2xl bg-white/5 p-4 text-sm text-white/70">Your wallet is empty. Use Manage cards to add your first card.</p>}

        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={busy || locations.length === 0}
            className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-sky-400 ${
              located ? 'border-cyan-400/35 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/[0.08] text-white/85'
            }`}
          >
            <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
              {located && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${located ? 'bg-cyan-400' : 'bg-white/50'}`} />
            </span>
            <span className="truncate">
              {arriving
                ? `Locating ${arriving.merchant.name}…`
                : located
                  ? `${rec.merchant.name} (${rec.merchant.category_label})`
                  : 'Simulate arriving at a store'}
            </span>
            <span aria-hidden="true" className="text-[10px] opacity-60">▾</span>
          </button>
          {located && (
            <label className="inline-flex items-center gap-1.5 text-[13px] text-white/50">
              Checkout
              <span className="inline-flex items-center rounded-lg bg-white/[0.08] px-2 py-1 focus-within:ring-1 focus-within:ring-sky-400">
                <span aria-hidden="true" className="font-semibold text-white">$</span>
                <input
                  aria-label={`Purchase amount in dollars (currently ${formatCents(rec.amount_cents)})`}
                  inputMode="decimal"
                  value={amountText}
                  disabled={busy || phase === 'receipt' || arriving !== null}
                  onChange={(e) => setAmountText(e.target.value)}
                  onBlur={commitAmount}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className="w-[4.5rem] bg-transparent font-semibold text-white outline-none disabled:opacity-60"
                />
              </span>
            </label>
          )}
        </div>

        {recError ? (
          <div className="mb-4">
            <ErrorNotice error={recError} onRetry={arriving ? undefined : () => setPickerOpen(true)} />
          </div>
        ) : null}

        {located && !winnerId && (
          <p role="alert" className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            No card in your wallet is accepted at {rec.merchant.name}.
          </p>
        )}

        <div ref={deckRef} className="flex w-full justify-center">
          <motion.div
            className="relative shrink-0 [clip-path:inset(-60px_-60px_0_-60px)]"
            style={{ width: cardW }}
            animate={{ height: deckHeight }}
            transition={SPRING}
          >
            {cards.map((card, idx) => {
              const s = slot(card, idx)
              const isWinner = card.id === winnerId
              return (
                <motion.div
                  key={card.id}
                  className="absolute left-0 top-0"
                  style={{ zIndex: s.z }}
                  initial={false}
                  animate={{ y: s.y, scale: s.scale, filter: `brightness(${s.dim})` }}
                  transition={isWinner && lifted ? { type: 'spring', stiffness: 500, damping: 14 } : { ...SPRING, delay: located ? 0 : idx * 0.03 }}
                >
                  <WalletCard card={card} width={cardW} height={cardH} evaluation={located ? evalById.get(card.id) : undefined} isWinner={isWinner} />
                  {isWinner && phase === 'scan' && (
                    // Proximity radar: concentric cyan rings from the card's top edge
                    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 z-10">
                      {[0, 0.4, 0.8].map((delay) => (
                        <motion.span
                          key={delay}
                          className="absolute h-6 w-6 rounded-full border-2 border-cyan-400/75"
                          style={{ x: '-50%', y: '-50%' }}
                          initial={{ scale: 0.2, opacity: 1 }}
                          animate={{ scale: 12, opacity: 0 }}
                          transition={{ duration: 1.2, ease: 'easeOut', repeat: Infinity, delay }}
                        />
                      ))}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {located && rec.why && (
          <div className="mt-4">
            <WhyDrawer rec={rec} />
          </div>
        )}

        {/* Pay bar stays reachable at the bottom of the scroll area */}
        <div className="sticky bottom-0 z-30 -mx-4 mt-auto flex flex-col items-center bg-gradient-to-b from-transparent to-black to-[28px] px-4 pb-2 pt-5">
          <PayButton phase={phase} disabled={!located || !winnerId || phase === 'receipt'} onHoldStart={holdStart} onHoldEnd={holdEnd} />
          {located && !busy && (
            <button type="button" onClick={leaveStore} className="mt-1 text-[13px] text-white/40 hover:text-white/60">
              Leave store
            </button>
          )}
        </div>

        <StorePicker open={pickerOpen} locations={locations} currentId={located ? rec.merchant.id : null} onPick={arriveAt} onClose={() => setPickerOpen(false)} />
        <Receipt
          data={phase === 'receipt' ? receipt : null}
          onDone={dismissReceipt}
          onRetry={() => purchase.current && void save(purchase.current.key, purchase.current.rec)}
        />
      </section>
    </MotionConfig>
  )
}
