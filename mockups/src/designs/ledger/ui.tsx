// Ledger: editorial calm. Paper, ink, one money green. Instrument Serif only at
// display sizes; Geist for everything you read or tap. Hairline rules, not boxes.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { merchantMark, type Card, type Network } from '../../data/data'

export const L = {
  paper: '#FAF9F6',
  ink: '#141414',
  muted: '#5E5D58',
  rule: 'rgba(20,20,20,0.18)',
  green: '#0F7B4A',
}

export const serif = 'font-[family-name:var(--font-serif)] font-normal'
export const muted = 'text-[#5E5D58]'
export const hairline = 'border-b-[0.5px] border-[rgba(20,20,20,0.2)]'
export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141414]'

export const cardSpring = { type: 'spring', duration: 0.55, bounce: 0.1 } as const
export const quick = { type: 'spring', duration: 0.35, bounce: 0 } as const

const NET: Record<Network, string> = { visa: 'Visa', amex: 'Amex', mastercard: 'Mastercard' }
export const networkName = (n: Network) => NET[n]

export function Masthead({ title, kicker, right }: { title: string; kicker?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 px-5 pb-3 pt-2">
      <div>
        {kicker ? <p className={`pb-0.5 text-[13px] font-medium ${muted}`}>{kicker}</p> : null}
        <h1 className={`${serif} text-[44px] leading-[44px] tracking-[-0.5px]`}>{title}</h1>
      </div>
      {right}
    </header>
  )
}

export function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
      className={`grid size-11 shrink-0 place-items-center rounded-full text-[#141414] shadow-[inset_0_0_0_1px_rgba(20,20,20,0.85)] ${focusRing}`}
    >
      {children}
    </motion.button>
  )
}

/** A ruled section heading: small Geist label, hairline underneath. */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className={`mx-5 flex items-baseline justify-between pb-2 ${hairline}`}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[1.2px]">{children}</h2>
      {right}
    </div>
  )
}

export function Rule({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`h-0 border-t-[0.5px] border-[rgba(20,20,20,0.2)] ${className}`} />
}

export function MerchantMark({ id, name, size = 32 }: { id: string; name: string; size?: number }) {
  const m = merchantMark(id, name)
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold tracking-tight"
      style={{ width: size, height: size, background: m.color, color: m.ink, fontSize: m.mark.length > 2 ? size * 0.3 : size * 0.4 }}
    >
      {m.mark}
    </span>
  )
}

/** The physical card. The only surfaces in Ledger that get a shadow. */
export function CardArt({ card, size }: { card: Card; size: 'mini' | 'full' }) {
  const full = size === 'full'
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ color: card.text_color, borderRadius: 'inherit' }}>
      <img src={`/cards/${card.type}.svg`} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      {full ? (
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.25 }}>
          <div className="absolute inset-x-4 top-3.5 flex items-start justify-between">
            <span className="text-[16px] font-semibold tracking-[-0.2px]">{card.name}</span>
            <span className="text-[12px] font-semibold uppercase tracking-[1.5px] opacity-90">{networkName(card.network)}</span>
          </div>
          <div className="absolute bottom-3.5 left-4 text-[14px] tracking-[2px] tabular-nums opacity-90">•••• {card.last4}</div>
        </motion.div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.18)]" />
    </div>
  )
}

/** Streak as tally marks: groups of five, the fifth struck through. */
export function Tally({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return <span className={`${muted} ${className}`}>None yet</span>
  const groups = Math.floor(count / 5)
  const rest = count % 5
  const shown = Math.min(groups, 4)
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label={`${count} in a row`}>
      {Array.from({ length: shown }, (_, g) => (
        <TallyGroup key={g} n={5} />
      ))}
      {rest ? <TallyGroup n={rest} /> : null}
    </span>
  )
}

function TallyGroup({ n }: { n: number }) {
  const w = 4 * 5 + 6
  return (
    <svg width={w} height="20" viewBox={`0 0 ${w} 20`} aria-hidden>
      {Array.from({ length: Math.min(n, 4) }, (_, i) => (
        <motion.line
          key={i}
          x1={4 + i * 5}
          x2={4 + i * 5}
          y1="2"
          y2="18"
          stroke="#141414"
          strokeWidth="1.6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.18, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
        />
      ))}
      {n >= 5 ? (
        <motion.line
          x1="1"
          x2={w - 1}
          y1="15"
          y2="5"
          stroke="#0F7B4A"
          strokeWidth="1.8"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.22, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
        />
      ) : null}
    </svg>
  )
}

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-[52px] w-full rounded-full bg-[#141414] text-[16px] font-semibold text-[#FAF9F6] transition-transform duration-150 ease-out active:scale-[0.98] disabled:bg-[#E4E2DC] disabled:text-[#5E5D58] ${focusRing}`}
    >
      {children}
    </button>
  )
}

export function TextButton({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-1 text-[15px] font-medium underline decoration-[rgba(20,20,20,0.35)] decoration-1 underline-offset-4 transition-colors duration-150 hover:decoration-[#141414] ${focusRing} ${className}`}
    >
      {children}
    </button>
  )
}
