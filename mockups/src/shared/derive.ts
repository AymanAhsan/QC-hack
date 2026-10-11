import { useCallback, useEffect, useRef, useState } from 'react'
import { cardById, cards, categoryRate, missed, nikeStack, type Card, type CardEvaluation, type RecommendResponse } from '../data/data'
import { money, mult, pct } from './format'

/** How a card stands at the current store. */
export type CardStanding =
  | { kind: 'no-store' }
  | { kind: 'best'; value: number; overDebit: number; rateLabel: string; short: string; multiplier: number; yieldPct: number }
  | { kind: 'behind'; value: number; behindBy: number; bestName: string; rateLabel: string; short: string; yieldPct: number }
  | { kind: 'rejected'; reason: string }

export function standing(rec: RecommendResponse | null, ev: CardEvaluation | null): CardStanding {
  if (!rec || !ev) return { kind: 'no-store' }
  if (!ev.accepted) return { kind: 'rejected', reason: notTaken(rec.merchant.name, ev.network) }
  const best = rec.ranking.find((r) => r.is_winner)
  if (ev.is_winner || !best) {
    const debit = rec.why?.advantage.default_debit
    return {
      kind: 'best',
      value: ev.value_cents,
      overDebit: debit ? debit.advantage_cents : ev.value_cents,
      rateLabel: ev.rate_label,
      short: rateShort(ev),
      multiplier: ev.multiplier,
      yieldPct: ev.yield_pct,
    }
  }
  return {
    kind: 'behind',
    value: ev.value_cents,
    behindBy: best.value_cents - ev.value_cents,
    bestName: best.card_name,
    rateLabel: ev.rate_label,
    short: rateShort(ev),
    yieldPct: ev.yield_pct,
  }
}

/** Short reward phrase: "4× grocery", "3% at Nike", "2× everywhere". */
export function rateShort(ev: CardEvaluation) {
  const n = ev.rate_label.includes('cash') ? `${ev.multiplier}%` : mult(ev.multiplier)
  if (ev.rate_source === 'base') return `${n} everywhere`
  const m = ev.rate_label.match(/ (on|at) (.+)$/)
  if (!m) return n
  return m[1] === 'at' ? `${n} at ${m[2]}` : `${n} ${m[2].toLowerCase()}`
}

export type WhyCheck = { ok: boolean | 'info'; label: string; detail?: string }

/** The engine's reasoning for the winner, as a checklist. */
export function whyChecks(rec: RecommendResponse): WhyCheck[] {
  const w = rec.why
  if (!w) return []
  const checks: WhyCheck[] = [
    { ok: true, label: w.network.label },
    { ok: 'info', label: `Coded as ${w.mcc.category_label.toLowerCase()}`, detail: `MCC ${w.mcc.code} · ${w.mcc.label}` },
    { ok: true, label: w.rate.label, detail: w.valuation.summary },
  ]
  for (const r of w.network.rejections) checks.push({ ok: false, label: notTaken(rec.merchant.name, r.network) })
  return checks
}

const NETWORK_NAME: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' }

/** "Costco doesn't take Amex". The engine's own label mentions a terminal, which the demo must not imply. */
export function notTaken(merchantName: string, network: string) {
  return `${merchantName} doesn't take ${NETWORK_NAME[network] ?? network}`
}

/** The runner-up line: "+$1.87 more than Venture X". */
export function runnerUpLine(rec: RecommendResponse) {
  const r = rec.why?.advantage.runner_up
  return r ? `${money(r.advantage_cents)} more than ${r.card_name}` : null
}

/** The single most useful fix for the Missed/Rewards screen. */
export function topFix() {
  const top = missed.by_category[0]
  if (!top) return null
  const best = [...cards].sort((a, b) => yieldOf(b, top.category) - yieldOf(a, top.category))[0]
  return {
    category: top.category,
    categoryLabel: top.category_label,
    /** "groceries", "flights": reads naturally after "for" */
    noun: CATEGORY_NOUN[top.category] ?? top.category_label.toLowerCase(),
    missedCents: top.missed_cents,
    card: best,
    yieldPct: Math.round(yieldOf(best, top.category) * 10) / 10,
    rateLabel: `${mult(categoryRate(best, top.category))} on ${top.category_label.toLowerCase()}`,
  }
}

export const CATEGORY_NOUN: Record<string, string> = {
  grocery: 'groceries',
  dining: 'dining',
  airfare: 'flights',
  travel: 'travel',
  travel_portal: 'travel bookings',
  apparel: 'clothes',
  hotel: 'hotels',
  gas: 'gas',
  discount_store: 'discount stores',
  drugstore: 'drugstores',
  wholesale_club: 'wholesale clubs',
}

const yieldOf = (c: Card, category: string) => categoryRate(c, category) * c.cpp

/** Card ranking for the scanned Nike cart, joined to card data. */
export function scanRanking() {
  return nikeStack.ranking
    .filter((r) => r.accepted)
    .map((r) => ({ ...r, card: cardById[r.card_id] }))
}

export const scanPctLabel = (v: number) => pct(v, true)

export type ScanStage = 'idle' | 'reading' | 'coupons' | 'cards' | 'result'

/** The scan flow: three honest stages, then the stack. ~1.8s total. */
export function useScanFlow() {
  const [stage, setStage] = useState<ScanStage>('idle')
  const timers = useRef<number[]>([])
  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  const start = useCallback(() => {
    clear()
    setStage('reading')
    timers.current.push(window.setTimeout(() => setStage('coupons'), 650))
    timers.current.push(window.setTimeout(() => setStage('cards'), 1250))
    timers.current.push(window.setTimeout(() => setStage('result'), 1850))
  }, [])
  const reset = useCallback(() => {
    clear()
    setStage('idle')
  }, [])
  useEffect(() => clear, [])
  return { stage, start, reset, stack: nikeStack }
}

export const SCAN_STAGE_LABEL: Record<Exclude<ScanStage, 'idle' | 'result'>, string> = {
  reading: 'Reading 3 items',
  coupons: `Checking ${nikeStack.coupons_considered.length} coupons`,
  cards: `Ranking your ${nikeStack.ranking.length} cards`,
}
