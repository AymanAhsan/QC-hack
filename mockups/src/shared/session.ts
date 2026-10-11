import { useCallback, useMemo, useState } from 'react'
import {
  cardById,
  cards as seededCards,
  history as seededHistory,
  locationById,
  missed,
  nikeStack,
  recommendations,
  type Card,
  type CardEvaluation,
  type CardType,
  type Transaction,
} from '../data/data'
import { DEMO_NOW } from './format'

/**
 * Everything a design needs to run the demo, kept out of the UI so the five
 * designs only differ in how they look and behave, never in the numbers.
 */
export function useDemoSession({ initialStoreId = 'trader-joes' }: { initialStoreId?: string | null } = {}) {
  const [storeId, setStoreId] = useState<string | null>(initialStoreId)
  const [logged, setLogged] = useState<Transaction[]>([])
  const [walletCards, setWalletCards] = useState<Card[]>(seededCards)

  /** Add a demo card of a known type. Rewards come from that type's template. */
  const addCard = useCallback((type: CardType, last4: string) => {
    const template = cardById[type]
    const card: Card = { ...template, id: `${type}-${Date.now()}`, last4 }
    setWalletCards((c) => [...c, card])
    return card
  }, [])
  const removeCard = useCallback((id: string) => setWalletCards((c) => c.filter((x) => x.id !== id)), [])

  const store = storeId ? locationById[storeId] : null
  const rec = storeId ? recommendations[storeId] : null
  const winnerId = rec?.winner_card_id ?? null

  const history = useMemo(() => [...logged, ...seededHistory], [logged])

  /** The engine's evaluation for a wallet card at the current store (looked up by card type). */
  const evaluation = useCallback(
    (cardId: string): CardEvaluation | null => {
      const type = walletCards.find((c) => c.id === cardId)?.type ?? cardId
      return rec?.ranking.find((r) => r.card_id === type) ?? null
    },
    [rec, walletCards],
  )

  /** Log an in-store payment at the current store. Returns the transaction. */
  const payInStore = useCallback(
    (cardId: string): Transaction | null => {
      if (!rec || !store) return null
      const used = evaluation(cardId)
      const best = rec.ranking.find((r) => r.card_id === rec.winner_card_id)
      if (!used?.accepted) return null
      const tx = makeTx({
        merchantId: store.merchant.id,
        merchantName: store.merchant.name,
        category: store.merchant.category,
        channel: 'store',
        amountCents: rec.amount_cents,
        cardId,
        bestCardId: rec.winner_card_id,
        earned: used.value_cents,
        best: best?.value_cents ?? used.value_cents,
        points: used.points,
      })
      setLogged((l) => [tx, ...l])
      return tx
    },
    [rec, store, evaluation],
  )

  /** Log the scanned Nike cart, paid with `cardId`. */
  const logScan = useCallback((cardId: string): Transaction => {
    const s = nikeStack
    const type = walletCards.find((c) => c.id === cardId)?.type ?? cardId
    const used = s.ranking.find((r) => r.card_id === type)
    const best = s.ranking.find((r) => r.card_id === s.winner_card_id)
    const tx = makeTx({
      merchantId: s.merchant.id,
      merchantName: s.merchant.name,
      category: s.merchant.category,
      channel: 'online',
      amountCents: s.charge_cents,
      subtotalCents: s.subtotal_cents,
      couponCode: s.coupon?.coupon.code ?? null,
      couponSavings: s.coupon?.savings_cents ?? 0,
      cardId,
      bestCardId: s.winner_card_id,
      earned: used?.value_cents ?? 0,
      best: best?.value_cents ?? 0,
      points: used?.points ?? null,
    })
    setLogged((l) => [tx, ...l])
    return tx
  }, [walletCards])

  const stats = useMemo(() => {
    const extra = logged.reduce(
      (a, t) => ({ earned: a.earned + t.earned_cents, best: a.best + t.best_possible_cents, missed: a.missed + t.missed_cents }),
      { earned: 0, best: 0, missed: 0 },
    )
    const earned = missed.total_earned_cents + extra.earned
    const best = missed.total_best_possible_cents + extra.best
    const missedCents = missed.total_missed_cents + extra.missed
    const maximized = history.filter(isMaximized).length
    return {
      earnedCents: earned,
      bestCents: best,
      missedCents,
      /** 0–1 share of possible rewards actually earned */
      captureRate: best ? earned / best : 1,
      count: missed.transaction_count + logged.length,
      maximized,
      streak: currentStreak(history),
      bestStreak: longestStreak(history),
      couponsStacked: history.filter((t) => t.coupon_code).length,
      /** Taken off orders by discount codes, on top of the rewards */
      couponSavedCents: history.reduce((sum, t) => sum + t.coupon_savings_cents, 0),
    }
  }, [history, logged])

  /** The wallet card that wins here (first instance of the winning type). */
  const winnerCardId = winnerId ? (walletCards.find((c) => c.type === winnerId)?.id ?? null) : null

  return {
    cards: walletCards,
    addCard,
    removeCard,
    winnerCardId,
    storeId,
    setStoreId,
    store,
    rec,
    winnerId,
    evaluation,
    history,
    logged,
    payInStore,
    logScan,
    stats,
    historyFor: (cardId: string) => history.filter((t) => t.card_used_id === cardId),
  }
}

export type DemoSession = ReturnType<typeof useDemoSession>

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
function makeTx(p: {
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
    id: `session-${seq}`,
    ts: new Date(Date.parse(DEMO_NOW) + seq * 60_000).toISOString(),
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

export { cardById }
