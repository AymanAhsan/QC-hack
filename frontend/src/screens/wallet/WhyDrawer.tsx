// "Why this card won": the engine's reasoning from RecommendResponse.why,
// with the net yield rolling in on an odometer.

import { motion } from 'motion/react'
import type { RecommendResponse, WhyBreakdown } from '../../types'
import { formatCents, formatPct } from '../../lib/format'
import { Odometer } from './Odometer'

type Tone = 'ok' | 'bad' | 'info'

const ICON: Record<Tone, { glyph: string; className: string }> = {
  ok: { glyph: '✔', className: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-400' },
  bad: { glyph: '✖', className: 'border-red-400/30 bg-red-500/15 text-red-400' },
  info: { glyph: 'i', className: 'border-sky-400/30 bg-sky-400/15 text-sky-400' },
}

function Check({ tone, label, detail }: { tone: Tone; label: string; detail?: string | null }) {
  const icon = ICON[tone]
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug">
      <span aria-hidden="true" className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${icon.className}`}>
        {icon.glyph}
      </span>
      <span>
        <span className={`font-semibold ${tone === 'bad' ? 'text-red-300' : 'text-white/95'}`}>{label}</span>
        {detail && <span className="mt-0.5 block text-xs text-white/50">{detail}</span>}
      </span>
    </li>
  )
}

function valuationLabel(v: WhyBreakdown['valuation']): string {
  return v.reward_type === 'points'
    ? `Valuation: ${v.cpp}¢/pt = ${formatPct(v.net_yield_pct)} return`
    : `Cash back: ${formatPct(v.net_yield_pct)} return`
}

export function WhyDrawer({ rec }: { rec: RecommendResponse }) {
  const why = rec.why
  if (!why) return null
  const cardName = (id: string) => rec.ranking.find((e) => e.card_id === id)?.card_name ?? id
  const { runner_up, default_debit } = why.advantage

  return (
    <motion.div
      key={rec.merchant.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.15 }}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 pb-4 pt-4 backdrop-blur-xl"
      aria-label="Why this card won"
    >
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/50">Why this card won</h2>

      <ul className="space-y-2.5">
        <Check
          tone="ok"
          label={`Category: ${why.mcc.category_label} (${why.valuation.reward_type === 'points' ? `${why.rate.multiplier}x multiplier` : `${why.rate.multiplier}% cash back`})`}
          detail={why.rate.source === 'merchant' ? `${why.rate.label} (store bonus)` : null}
        />
        <Check tone="ok" label={valuationLabel(why.valuation)} detail={why.valuation.summary} />
        <Check tone="ok" label={`Network: ${why.network.label}`} />
        {why.network.rejections.map((r) => (
          <Check key={r.card_id} tone="bad" label={r.label} detail={`${cardName(r.card_id)} disqualified`} />
        ))}
        <Check tone="info" label={`Classified as ${why.mcc.label}`} detail={[`MCC ${why.mcc.code}`, why.mcc.note].filter(Boolean).join(' · ')} />
      </ul>

      <div className="my-3.5 h-px bg-white/10" />

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-white/50">
          {formatPct(why.valuation.base_yield_pct)} base ➔ {why.valuation.reward_type === 'points' ? `${why.valuation.multiplier}x @ ${why.valuation.cpp}¢` : `${why.valuation.multiplier}% cash`}
        </span>
        <Odometer value={why.valuation.net_yield_pct} decimals={1} className="text-2xl text-emerald-400" />
      </div>

      <div className="mt-3 flex flex-col items-start gap-1.5">
        {default_debit && default_debit.advantage_cents > 0 && (
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-sm font-semibold text-emerald-400">
            ↑ +{formatCents(default_debit.advantage_cents)} earned over your default debit card
          </span>
        )}
        {runner_up && runner_up.advantage_cents > 0 && (
          <span className="pl-1 text-xs text-white/50">
            +{formatCents(runner_up.advantage_cents)} more than {runner_up.card_name}
          </span>
        )}
      </div>
    </motion.div>
  )
}
