// The Triple Stack, revealed in order: coupon, then card, then the combined value.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { Card, CartParseResponse, StackResponse } from '../../types'
import { formatCents, formatPct } from '../../lib/format'
import { CardSwatch } from './CardSwatch'

const EASE_OUT_EXPO = [0.19, 1, 0.22, 1] as const

/** Layers rise in one after another; reduced motion keeps only the fade (MotionConfig in ScanScreen). */
export function Reveal({ order, children }: { order: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: order * 0.14 }}
    >
      {children}
    </motion.div>
  )
}

function Layer({ step, title, highlight, children }: { step: number; title: string; highlight?: boolean; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className={`rounded-2xl p-4 ${highlight ? 'bg-emerald-400/10 ring-1 ring-emerald-300/30' : 'bg-white/[0.06]'}`}
    >
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[11px] text-white/80">{step}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Pill({ tone, children }: { tone: 'amber' | 'sky'; children: ReactNode }) {
  const tones = {
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
  }
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>
}

function Header({ stack, parse }: { stack: StackResponse; parse: CartParseResponse | null }) {
  const { merchant } = stack
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl">
          {merchant.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-balance break-words">{merchant.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/55">
            {merchant.category_label}
            {!stack.merchant_known && <Pill tone="sky">New store</Pill>}
            {parse && (parse.is_sample ? <Pill tone="amber">Sample cart</Pill> : <Pill tone="sky">Read by Gemini</Pill>)}
          </p>
        </div>
      </div>
      {parse?.warning && (
        <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-sm text-amber-100">
          {parse.warning}
        </p>
      )}
    </div>
  )
}

function CartItems({ parse }: { parse: CartParseResponse }) {
  const { items, subtotal_cents, shipping_cents } = parse.cart
  return (
    <ul className="divide-y divide-white/10 rounded-2xl bg-white/[0.04] px-4 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex justify-between gap-3 py-2.5">
          <span className="min-w-0 text-white/80">
            <span className="tabular-nums text-white/45">{item.qty}×</span> {item.name}
          </span>
          <span className="shrink-0 tabular-nums">{formatCents(item.price_cents)}</span>
        </li>
      ))}
      <li className="flex justify-between py-2.5 font-medium">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatCents(subtotal_cents)}</span>
      </li>
      {shipping_cents !== null && (
        <li className="flex justify-between py-2.5 text-white/70">
          <span>Shipping</span>
          <span className="tabular-nums">{shipping_cents === 0 ? 'Free' : formatCents(shipping_cents)}</span>
        </li>
      )}
    </ul>
  )
}

function CouponLayer({ stack }: { stack: StackResponse }) {
  const applied = stack.coupon
  const others = stack.coupons_considered.filter((c) => c.coupon.code !== applied?.coupon.code)
  return (
    <Layer step={1} title="Coupon">
      {applied ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-block rounded-lg border border-dashed border-white/35 px-2 py-0.5 font-mono text-base font-semibold tracking-wider">
                {applied.coupon.code}
              </span>
              <p className="mt-1.5 text-sm text-white/75">{applied.coupon.description}</p>
            </div>
            <span className="shrink-0 text-lg font-semibold tabular-nums text-emerald-300">−{formatCents(applied.savings_cents)}</span>
          </div>
          <p className="mt-2 text-xs text-amber-200/80">{applied.coupon.label}</p>
          <p className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm">
            <span className="text-white/60">You pay</span>
            <span className="font-medium tabular-nums">{formatCents(stack.charge_cents)}</span>
          </p>
        </>
      ) : (
        <p className="text-sm text-white/70">No coupon applies to this order.</p>
      )}
      {others.length > 0 && (
        <p className="mt-2 text-xs text-white/45">
          Also checked:{' '}
          {others
            .map((c) => (c.eligible ? `${c.coupon.code} (−${formatCents(c.savings_cents)})` : `${c.coupon.code} (${c.reason?.toLowerCase()})`))
            .join(' · ')}
        </p>
      )}
    </Layer>
  )
}

function CardLayer({ stack, cards }: { stack: StackResponse; cards: Card[] }) {
  const winner = stack.ranking.find((r) => r.is_winner)
  if (!winner) {
    return (
      <Layer step={2} title="Card">
        <p className="text-sm text-white/70">None of your cards are accepted here.</p>
      </Layer>
    )
  }
  const runnerUp = stack.ranking.find((r) => r.accepted && !r.is_winner)
  return (
    <Layer step={2} title="Card">
      <div className="flex items-center gap-3">
        <CardSwatch card={cards.find((c) => c.id === winner.card_id)} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{winner.card_name}</p>
          <p className="text-sm text-white/60">
            {winner.rate_label}
            {/* Points cards need the conversion spelled out; a cash label already says the percent. */}
            {winner.points !== null && ` · ${formatPct(winner.yield_pct)} back`}
          </p>
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-semibold tabular-nums text-emerald-300">+{formatCents(winner.value_cents)}</span>
          {winner.points !== null && <span className="block text-xs tabular-nums text-white/50">{winner.points.toLocaleString()} pts</span>}
        </span>
      </div>
      {runnerUp && (
        <p className="mt-3 text-xs text-white/45">
          Beats {runnerUp.card_name} by {formatCents(winner.value_cents - runnerUp.value_cents)} on {formatCents(stack.charge_cents)}
        </p>
      )}
    </Layer>
  )
}

function TotalLayer({ stack }: { stack: StackResponse }) {
  const couponCents = stack.coupon?.savings_cents ?? 0
  return (
    <Layer step={3} title="Total value back" highlight>
      <p className="text-4xl font-bold tracking-tight tabular-nums text-emerald-300">{formatCents(stack.total_value_cents)}</p>
      <p className="mt-1 text-sm text-white/70">
        {formatPct(stack.total_value_pct)} back on {formatCents(stack.original_total_cents)}
      </p>
      <p className="mt-2 text-xs text-white/50">
        {formatCents(couponCents)} coupon + {formatCents(stack.rewards_value_cents)} card rewards
      </p>
    </Layer>
  )
}

export function StackResult({ stack, parse, cards }: { stack: StackResponse; parse: CartParseResponse | null; cards: Card[] }) {
  return (
    <div className="space-y-3">
      <Header stack={stack} parse={parse} />
      {parse ? (
        <CartItems parse={parse} />
      ) : (
        <p className="flex justify-between rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm font-medium">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCents(stack.subtotal_cents)}</span>
        </p>
      )}
      <Reveal order={0}>
        <CouponLayer stack={stack} />
      </Reveal>
      <Reveal order={1}>
        <CardLayer stack={stack} cards={cards} />
      </Reveal>
      <Reveal order={2}>
        <TotalLayer stack={stack} />
      </Reveal>
    </div>
  )
}
