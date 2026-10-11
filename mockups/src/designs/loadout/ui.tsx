// Loadout: pick your card like a character. Neutral greys on ink; the only
// colored light is the selected card's own glow. One functional accent: money.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { categoryYieldPct, merchantMark, type Card } from '../../data/data'

export const L = {
  bg: '#0B0D12',
  raised: '#13161D',
  raised2: '#1A1E27',
  line: 'rgba(255,255,255,0.08)',
  text: '#EEF0F4',
  dim: '#9BA3B1',
  faint: '#5E6676',
  money: '#9BE36D',
}

export const springSnap = { type: 'spring', duration: 0.45, bounce: 0.18 } as const
export const springCalm = { type: 'spring', duration: 0.4, bounce: 0 } as const

/** Mono label: small caps-like stat header. Content stays mixed case for screen readers. */
export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#9BA3B1] ${className}`}>{children}</span>
}

export function ScreenHeader({ title, kicker, right }: { title: string; kicker?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between px-5 pb-3 pt-2">
      <div>
        {kicker ? <Label>{kicker}</Label> : null}
        <h1 className="text-[30px] font-semibold leading-[34px] tracking-[-0.02em]">{title}</h1>
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </header>
  )
}

export function IconButton({
  label,
  onClick,
  children,
  className = '',
}: {
  label: string
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
      className={`grid size-11 place-items-center rounded-full bg-[#1A1E27] text-[#EEF0F4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#EEF0F4] ${className}`}
    >
      {children}
    </motion.button>
  )
}

/** Primary action: the money accent with ink text (11:1). One per view. */
export function PrimaryButton({ children, onClick, disabled, className = '' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
      className={`h-[52px] w-full rounded-[14px] bg-[#9BE36D] text-[17px] font-semibold text-[#0B0D12] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#EEF0F4] disabled:bg-[#1A1E27] disabled:text-[#5E6676] ${className}`}
    >
      {children}
    </motion.button>
  )
}

export function GhostButton({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 w-full rounded-[12px] text-[16px] font-medium text-[#EEF0F4] underline-offset-4 transition-colors duration-150 hover:bg-white/[0.04] active:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#EEF0F4] ${className}`}
    >
      {children}
    </button>
  )
}

export function MerchantMark({ id, name, size = 38 }: { id: string; name: string; size?: number }) {
  const m = merchantMark(id, name)
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[10px] font-semibold tracking-tight"
      style={{ width: size, height: size, background: m.color, color: m.ink, fontSize: m.mark.length > 2 ? size * 0.28 : size * 0.38 }}
    >
      {m.mark}
    </span>
  )
}

const NETWORK: Record<string, string> = { visa: 'VISA', amex: 'AMEX', mastercard: 'mastercard' }

/** Card art: the team's artwork with name, network, and masked number on top. */
export function CardArt({ card, mini = false, locked = false }: { card: Card; mini?: boolean; locked?: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ color: card.text_color, borderRadius: mini ? 5 : 16 }}>
      <img
        src={`/cards/${card.type}.svg`}
        alt=""
        draggable={false}
        className={`absolute inset-0 h-full w-full object-cover ${locked ? 'grayscale-[0.85] brightness-[0.55]' : ''}`}
      />
      {!mini ? (
        <>
          <div className="absolute inset-x-4 top-3.5 flex items-start justify-between">
            <span className="text-[16px] font-semibold tracking-[-0.01em]">{card.name}</span>
            <span className={`text-[12px] font-bold tracking-[0.06em] ${card.network === 'mastercard' ? 'font-semibold lowercase' : 'italic'}`}>{NETWORK[card.network]}</span>
          </div>
          <div className="absolute bottom-3.5 left-4 font-mono text-[13px] tracking-[0.18em] opacity-90">•••• {card.last4}</div>
        </>
      ) : null}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]" />
    </div>
  )
}

/** The five stats on every card's sheet, plus the store's own category when it isn't one of them. */
export type Stat = { key: string; label: string; yieldPct: number; highlight: boolean }

const TRAVEL = ['airfare', 'hotel', 'travel']
const MAIN = ['dining', 'grocery', 'travel', 'gas']

export function cardStats(card: Card, storeCategory: string | null, storeLabel: string | null): Stat[] {
  const travel = Math.max(...TRAVEL.map((c) => categoryYieldPct(card, c)))
  const storeKey = storeCategory ? (TRAVEL.includes(storeCategory) ? 'travel' : storeCategory) : null
  const stats: Stat[] = [
    { key: 'dining', label: 'Dining', yieldPct: categoryYieldPct(card, 'dining'), highlight: storeKey === 'dining' },
    { key: 'grocery', label: 'Grocery', yieldPct: categoryYieldPct(card, 'grocery'), highlight: storeKey === 'grocery' },
    { key: 'travel', label: 'Travel', yieldPct: travel, highlight: storeKey === 'travel' },
    { key: 'gas', label: 'Gas', yieldPct: categoryYieldPct(card, 'gas'), highlight: storeKey === 'gas' },
  ]
  if (storeCategory && storeKey && !MAIN.includes(storeKey)) {
    stats.push({ key: storeCategory, label: storeLabel ?? storeCategory, yieldPct: categoryYieldPct(card, storeCategory), highlight: true })
  } else {
    stats.push({ key: 'base', label: 'Everything', yieldPct: Math.round(card.base_rate * card.cpp * 10) / 10, highlight: false })
  }
  return stats
}

/** Scale for stat bars: the best yield anywhere in the demo wallet is 7.2%. */
export const STAT_MAX = 8

const SEGMENT_MASK = 'repeating-linear-gradient(to right, #000 0 calc(6.25% - 3px), transparent calc(6.25% - 3px) 6.25%)'

/** Segmented stat bar. The fill is one element scaled on X, so switching cards slides it like a stat change. */
export function StatBar({ stat, accent }: { stat: Stat; accent: string }) {
  // Whole segments only, so a bar never ends in a sliver.
  const v = Math.round((Math.min(stat.yieldPct, STAT_MAX) / STAT_MAX) * 16) / 16
  return (
    <div className="flex items-center gap-3">
      <span className={`w-[104px] shrink-0 truncate text-[13px] ${stat.highlight ? 'font-semibold text-[#EEF0F4]' : 'text-[#9BA3B1]'}`}>{stat.label}</span>
      <div className="relative h-[8px] flex-1" style={{ maskImage: SEGMENT_MASK, WebkitMaskImage: SEGMENT_MASK }} aria-hidden>
        <div className="absolute inset-0 bg-white/[0.08]" />
        <motion.div
          className="absolute inset-0 origin-left"
          style={{ background: stat.highlight ? accent : 'rgba(238,240,244,0.6)' }}
          initial={false}
          animate={{ scaleX: v }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
        />
      </div>
      <span className={`w-[44px] shrink-0 text-right font-mono text-[13px] tabular-nums ${stat.highlight ? 'text-[#EEF0F4]' : 'text-[#9BA3B1]'}`}>
        {stat.yieldPct.toFixed(1)}%
      </span>
    </div>
  )
}

export function Row({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  last = false,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  last?: boolean
}) {
  const body = (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] leading-[21px]">{title}</div>
        {subtitle ? <div className="truncate text-[13px] leading-[18px] text-[#9BA3B1]">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
    </>
  )
  const cls = `flex w-full min-h-[60px] items-center gap-3 px-4 py-2.5 text-left ${last ? '' : 'shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]'}`
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-colors duration-150 active:bg-white/[0.04] focus-visible:bg-white/[0.05] focus-visible:shadow-[inset_0_0_0_2px_rgba(238,240,244,0.6)] focus-visible:outline-none`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-[18px] bg-[#13161D] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] ${className}`}>{children}</div>
}
