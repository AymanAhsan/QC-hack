// The app's live state on the real API: your cards, where you are, how your
// cards rank there, and what you've bought. The shell owns it, so it survives
// tab changes (screens unmount).
//
//   GET /api/wallet + /api/locations on start
//   GET /api/recommend whenever the store, amount, or wallet changes
//   GET /api/missed on start and after every logged purchase
//   POST /api/transactions to log a purchase (simulated, nothing is charged)
//   POST/DELETE /api/users/{id}/cards to add or remove a card

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { activeUserId, api, newIdempotencyKey } from './api'
import { useStoreDetection } from './location'
import { useNav } from './navigation'
import type { Card, CardEvaluation, CardType, Location, MissedResponse, RecommendResponse, StackResponse, Transaction, TransactionCreate } from './types'

/** A purchase that couldn't be saved, and how to try again. */
export interface SaveFailure {
  merchantName: string
  error: unknown
  retry: () => void
}

export function useSession() {
  const nav = useNav()
  const detection = useStoreDetection()
  const { transactionsVersion, notifyTransactionLogged } = nav

  // ── Wallet and stores ────────────────────────────────────────────
  const [cards, setCards] = useState<Card[] | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loadError, setLoadError] = useState<unknown>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  // Bumps when the wallet changes, so the ranking is fetched again.
  const [walletVersion, setWalletVersion] = useState(0)

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

  const reloadWallet = useCallback(async () => {
    const w = await api.wallet()
    setCards(w.cards)
    setWalletVersion((v) => v + 1)
  }, [])

  const addCard = useCallback(
    async (type: CardType, last4: string) => {
      const card = await api.createCard(activeUserId(), { type, last4 })
      await reloadWallet()
      return card
    },
    [reloadWallet],
  )

  const removeCard = useCallback(
    async (id: string) => {
      await api.deleteCard(activeUserId(), id)
      await reloadWallet()
    },
    [reloadWallet],
  )

  // ── Where you are ────────────────────────────────────────────────
  const [storeId, setStoreIdState] = useState<string | null>(null)
  // Typed checkout total; null means the store's typical spend.
  const [amountCents, setAmountCents] = useState<number | null>(null)
  // Latest location match already acted on, or deliberately overridden by a manual choice.
  const handledDetection = useRef(0)
  const [detectedHere, setDetectedHere] = useState(false)

  /** Pick a store by hand (or null to leave). A manual choice is never overridden by the location check. */
  const setStoreId = useCallback(
    (id: string | null) => {
      handledDetection.current = detection.id
      setDetectedHere(false)
      setStoreIdState(id)
      setAmountCents(null)
    },
    [detection.id],
  )

  // Arrive at the detected store once per match, and only when you're not already somewhere.
  useEffect(() => {
    const { status, location, id } = detection
    if (status !== 'detected' || !location || id === handledDetection.current) return
    if (!cards || storeId !== null) return
    handledDetection.current = id
    setStoreIdState(location.id)
    setAmountCents(null)
    setDetectedHere(true)
  }, [detection, cards, storeId])

  const store = useMemo(() => locations.find((l) => l.id === storeId) ?? null, [locations, storeId])

  // ── The ranking here ─────────────────────────────────────────────
  const [rec, setRec] = useState<RecommendResponse | null>(null)
  const [recError, setRecError] = useState<unknown>(null)
  const [recAttempt, setRecAttempt] = useState(0)

  useEffect(() => {
    if (!storeId) return
    const ctrl = new AbortController()
    setRecError(null)
    api.recommend(storeId, amountCents ?? undefined, ctrl.signal).then(setRec, (e) => !ctrl.signal.aborted && setRecError(e))
    return () => ctrl.abort()
  }, [storeId, amountCents, walletVersion, recAttempt])

  // A ranking for another store is stale; for the same store (new amount) it stays up until the new one lands.
  const here = rec && storeId && rec.merchant.id === store?.merchant.id ? rec : null
  const winnerCardId = here?.winner_card_id ?? null

  const evaluation = useCallback((cardId: string): CardEvaluation | null => here?.ranking.find((r) => r.card_id === cardId) ?? null, [here])

  // ── History ──────────────────────────────────────────────────────
  const [missed, setMissed] = useState<MissedResponse | null>(null)
  const [missedError, setMissedError] = useState<unknown>(null)
  // Purchases made in this session that the last /api/missed didn't include yet.
  const [logged, setLogged] = useState<Transaction[]>([])
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null)

  // Refetch when you come back to the app too: another device may have logged a purchase.
  const [missedAttempt, setMissedAttempt] = useState(0)
  useEffect(() => {
    const refresh = () => document.visibilityState === 'visible' && setMissedAttempt((n) => n + 1)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    setMissedError(null)
    api.missed({ days: 30, limit: 200 }, ctrl.signal).then(
      (m) => {
        setMissed(m)
        const known = new Set(m.recent.map((t) => t.id))
        setLogged((l) => l.filter((t) => !known.has(t.id)))
      },
      (e) => !ctrl.signal.aborted && setMissedError(e),
    )
    return () => ctrl.abort()
  }, [transactionsVersion, missedAttempt])

  const history = useMemo(
    () => [...logged, ...(missed?.recent ?? [])].sort((a, b) => b.ts.localeCompare(a.ts)),
    [logged, missed],
  )

  /**
   * Save a purchase. `preview` shows in the history right away; the server's numbers replace it.
   * A failure removes it again and offers a retry with the same idempotency key, so nothing is logged twice.
   */
  const save = useCallback(
    (body: Omit<TransactionCreate, 'idempotency_key'>, preview: Transaction) => {
      const key = newIdempotencyKey()
      const attempt = async (): Promise<Transaction | null> => {
        setSaveFailure(null)
        setLogged((l) => [preview, ...l.filter((t) => t.id !== preview.id)])
        try {
          const { transaction } = await api.createTransaction({ ...body, idempotency_key: key })
          setLogged((l) => [transaction, ...l.filter((t) => t.id !== preview.id && t.id !== transaction.id)])
          notifyTransactionLogged()
          return transaction
        } catch (error) {
          setLogged((l) => l.filter((t) => t.id !== preview.id))
          setSaveFailure({ merchantName: preview.merchant_name, error, retry: () => void attempt() })
          return null
        }
      }
      return attempt()
    },
    [notifyTransactionLogged],
  )

  /** Pay at the current store with `cardId`. Returns what the purchase earns, before the server confirms it. */
  const payInStore = useCallback(
    (cardId: string): Transaction | null => {
      if (!here || !store) return null
      const used = evaluation(cardId)
      if (!used?.accepted) return null
      const best = here.ranking.find((r) => r.card_id === here.winner_card_id)
      const preview = previewTx({
        merchantId: here.merchant.id,
        merchantName: here.merchant.name,
        category: here.merchant.category,
        channel: 'store',
        amountCents: here.amount_cents,
        cardId,
        bestCardId: here.winner_card_id,
        earned: used.value_cents,
        best: best?.value_cents ?? used.value_cents,
        points: used.points,
      })
      void save(
        { merchant_id: here.merchant.id, subtotal_cents: here.amount_cents, card_used_id: cardId, channel: 'store', source: 'wallet' },
        preview,
      )
      return preview
    },
    [here, store, evaluation, save],
  )

  /** Log a scanned cart paid with `cardId`. Resolves to the saved purchase, or null if it couldn't be saved. */
  const logScan = useCallback(
    (stack: StackResponse, cardId: string) => {
      const used = stack.ranking.find((r) => r.card_id === cardId)
      const best = stack.ranking.find((r) => r.card_id === stack.winner_card_id)
      const preview = previewTx({
        merchantId: stack.merchant.id,
        merchantName: stack.merchant.name,
        category: stack.merchant.category,
        channel: 'online',
        amountCents: stack.charge_cents,
        subtotalCents: stack.subtotal_cents,
        couponCode: stack.coupon?.coupon.code ?? null,
        couponSavings: stack.coupon?.savings_cents ?? 0,
        cardId,
        bestCardId: stack.winner_card_id,
        earned: used?.value_cents ?? 0,
        best: best?.value_cents ?? 0,
        points: used?.points ?? null,
      })
      return save(
        {
          ...(stack.merchant_known ? { merchant_id: stack.merchant.id } : { merchant_name: stack.merchant.name }),
          subtotal_cents: stack.subtotal_cents,
          shipping_cents: stack.shipping_cents,
          coupon_code: stack.coupon?.coupon.code ?? null,
          card_used_id: cardId,
          channel: 'online',
          source: 'scan',
        },
        preview,
      )
    },
    [save],
  )

  const stats = useMemo(() => {
    // Purchases from this session that the last /api/missed summary doesn't count yet.
    const extra = logged.reduce(
      (a, t) => ({ earned: a.earned + t.earned_cents, best: a.best + t.best_possible_cents, missed: a.missed + t.missed_cents }),
      { earned: 0, best: 0, missed: 0 },
    )
    const earned = (missed?.total_earned_cents ?? 0) + extra.earned
    const best = (missed?.total_best_possible_cents ?? 0) + extra.best
    return {
      earnedCents: earned,
      bestCents: best,
      missedCents: (missed?.total_missed_cents ?? 0) + extra.missed,
      /** 0–1 share of possible rewards actually earned */
      captureRate: best ? earned / best : 1,
      count: (missed?.transaction_count ?? 0) + logged.length,
      maximized: history.filter(isMaximized).length,
      streak: currentStreak(history),
      bestStreak: longestStreak(history),
      couponsStacked: history.filter((t) => t.coupon_code).length,
      /** Taken off orders by discount codes, on top of the rewards */
      couponSavedCents: history.reduce((sum, t) => sum + t.coupon_savings_cents, 0),
    }
  }, [history, logged, missed])

  const historyFor = useCallback((cardId: string) => history.filter((t) => t.card_used_id === cardId), [history])

  return {
    detection,
    /** True when the current store came from the location check rather than a manual pick. */
    detectedHere,
    cards: cards ?? [],
    cardsLoaded: cards !== null,
    loadError,
    retryLoad: () => setLoadAttempt((n) => n + 1),
    addCard,
    removeCard,
    locations,
    storeId,
    setStoreId,
    store,
    amountCents: here?.amount_cents ?? null,
    setAmountCents,
    rec: here,
    recError,
    retryRec: () => setRecAttempt((n) => n + 1),
    winnerCardId,
    evaluation,
    missed,
    missedError,
    retryMissed: () => setMissedAttempt((n) => n + 1),
    history,
    historyFor,
    payInStore,
    logScan,
    saveFailure,
    dismissSaveFailure: () => setSaveFailure(null),
    stats,
  }
}

export type Session = ReturnType<typeof useSession>

export const isMaximized = (t: Transaction) => t.missed_cents === 0

function currentStreak(h: Transaction[]) {
  let n = 0
  for (const t of h) {
    if (!isMaximized(t)) break
    n++
  }
  return n
}

function longestStreak(h: Transaction[]) {
  let best = 0
  let run = 0
  for (const t of [...h].reverse()) {
    run = isMaximized(t) ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

let seq = 0
/** The purchase as the app expects it to be saved, shown until the server answers. */
function previewTx(p: {
  merchantId: string
  merchantName: string
  category: string
  channel: 'store' | 'online'
  amountCents: number
  subtotalCents?: number
  couponCode?: string | null
  couponSavings?: number
  cardId: string
  bestCardId: string | null
  earned: number
  best: number
  points: number | null
}): Transaction {
  seq += 1
  return {
    id: `preview-${seq}`,
    ts: new Date().toISOString(),
    merchant_id: p.merchantId,
    merchant_name: p.merchantName,
    category: p.category,
    channel: p.channel,
    source: p.channel === 'store' ? 'wallet' : 'scan',
    subtotal_cents: p.subtotalCents ?? p.amountCents,
    shipping_cents: null,
    coupon_code: p.couponCode ?? null,
    coupon_savings_cents: p.couponSavings ?? 0,
    amount_cents: p.amountCents,
    card_used_id: p.cardId,
    best_card_id: p.bestCardId,
    earned_cents: p.earned,
    best_possible_cents: Math.max(p.best, p.earned),
    missed_cents: Math.max(0, p.best - p.earned),
    points_earned: p.points,
    is_simulated: true,
  }
}
