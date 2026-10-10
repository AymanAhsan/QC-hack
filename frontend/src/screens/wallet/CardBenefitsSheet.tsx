// Bottom sheet for one card: what it earns where, where it is the best card in
// this wallet, and where its network is declined. Every number comes from
// GET /api/wallet/{card_id}/benefits, so it always agrees with the recommendations.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api } from '../../api'
import type { BenefitRow, Card, CardBenefitsResponse } from '../../types'
import { formatPct } from '../../lib/format'
import { ErrorNotice, Loading } from '../../components/ui'

const NETWORK_NAME: Record<Card['network'], string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' }

const CATEGORY_EMOJI: Record<string, string> = {
  dining: '🍽️',
  grocery: '🛒',
  airfare: '✈️',
  hotel: '🏨',
  travel: '🧳',
  travel_portal: '🌍',
  gas: '⛽',
  drugstore: '💊',
  wholesale_club: '📦',
  discount_store: '🎯',
  apparel: '👕',
  general: '🛍️',
}

function rowEmoji(row: BenefitRow): string {
  if (row.kind === 'base') return '💳'
  return row.emoji ?? CATEGORY_EMOJI[row.key] ?? '🛍️'
}

function rowDetail(row: BenefitRow): string {
  if (row.kind === 'base') return 'All other purchases'
  if (row.kind === 'merchant') return 'Store bonus'
  return row.applies_to.length ? row.applies_to.join(', ') : 'No demo stores in this category'
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.12em] text-white/50">{children}</h3>
}

function Swatch({ card }: { card: Card }) {
  const [from, to] = card.gradient
  return (
    <span
      aria-hidden="true"
      className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
      style={{ backgroundImage: `url("${card.image}"), linear-gradient(135deg, ${from}, ${to})`, backgroundSize: 'cover' }}
    />
  )
}

function Body({ data }: { data: CardBenefitsResponse }) {
  const top = Math.max(...data.benefits.map((r) => r.yield_pct))
  return (
    <>
      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/75">
        {data.valuation_label}
      </span>

      <SectionTitle>Rewards</SectionTitle>
      <ul className="divide-y divide-white/[0.08] rounded-2xl border border-white/10 bg-white/[0.06]">
        {data.benefits.map((row) => {
          const isTop = row.kind !== 'base' && row.yield_pct === top && top > 0
          return (
            <li key={`${row.kind}:${row.key}`} className="flex items-center gap-3 px-4 py-3">
              <span aria-hidden="true" className="text-xl">
                {rowEmoji(row)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {row.label}
                  {isTop && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                      Top rate
                    </span>
                  )}
                </span>
                <span className="block truncate text-[13px] text-white/45">{rowDetail(row)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold">{row.rate_label}</span>
                <span className={`block text-xs font-semibold ${row.kind === 'base' ? 'text-white/45' : 'text-emerald-400'}`}>
                  {formatPct(row.yield_pct)} value
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      <SectionTitle>Best card in your wallet at</SectionTitle>
      {data.best_at.length ? (
        <ul className="flex flex-wrap gap-2">
          {data.best_at.map((s) => (
            <li
              key={s.merchant_id}
              className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-300"
            >
              <span aria-hidden="true">{s.emoji}</span> {s.merchant_name}
              {s.yield_pct !== null && <span className="text-emerald-400/70"> · {formatPct(s.yield_pct)}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/45">Another card in your wallet earns more at every demo store.</p>
      )}

      {data.not_accepted_at.length > 0 && (
        <>
          <SectionTitle>Heads up</SectionTitle>
          <ul className="space-y-2.5">
            {data.not_accepted_at.map((s) => (
              <li key={s.merchant_id} className="flex items-start gap-2.5 text-sm leading-snug">
                <span
                  aria-hidden="true"
                  className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-400/30 bg-red-500/15 text-[11px] font-bold text-red-400"
                >
                  ✖
                </span>
                <span>
                  <span className="font-semibold text-red-300">
                    {NETWORK_NAME[data.card.network]} not accepted at {s.merchant_name}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    Terminals take {s.accepts.map((n) => NETWORK_NAME[n]).join(', ')} only
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-5 text-[11px] text-white/35">Demo rates and point valuations · not issuer data. Wins are at each store's typical order size.</p>
    </>
  )
}

export function CardBenefitsSheet({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const [data, setData] = useState<CardBenefitsResponse | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!card) return
    const ctrl = new AbortController()
    setData(null)
    setError(null)
    api.cardBenefits(card.id, ctrl.signal).then(setData, (e) => !ctrl.signal.aborted && setError(e))
    return () => ctrl.abort()
  }, [card, attempt])

  useEffect(() => {
    if (!card) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, onClose])

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${card.name} benefits`}
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[#1c1c1e] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-white/25" />
            <div className="mb-3 flex items-center gap-3">
              <Swatch card={card} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[17px] font-semibold">{card.name}</h2>
                <p className="text-[13px] text-white/45">
                  {card.issuer} · {NETWORK_NAME[card.network]} •••• {card.last4}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                Done
              </button>
            </div>
            {error ? <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} /> : data ? <Body data={data} /> : <Loading label="Loading benefits…" />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
