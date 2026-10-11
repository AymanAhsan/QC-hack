// Arcade: tactile and chunky. Warm cream canvas, one jade primary, Nunito at
// heavy weights. The signature is the push: every tappable surface sits on a
// solid darker edge and drops onto it when pressed (transform only).

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { merchantMark, type Card } from '../../data/data'

export const A = {
  canvas: '#FFF7EC',
  tile: '#FFFFFF',
  tileEdge: '#EADFCC',
  sunk: '#F4EADB',
  ink: '#1F1F1F',
  muted: '#6B6257',
  faint: '#A79C8E',
  jade: '#1FCB82',
  jadeEdge: '#12935C',
  jadeInk: '#0B7D4D',
  jadeTint: '#E3F7EC',
  flame: '#FF9A2E',
  flameEdge: '#D66F00',
  flameInk: '#B35400',
  flameTint: '#FFEBD3',
}

export const R = { sm: 14, md: 18, lg: 24 }

type Tone = 'jade' | 'tile' | 'soft' | 'flame' | 'ink'
const TONES: Record<Tone, { face: string; edge: string; text: string }> = {
  jade: { face: A.jade, edge: A.jadeEdge, text: A.ink },
  tile: { face: A.tile, edge: A.tileEdge, text: A.ink },
  /** Secondary push that sits inside a white tile. */
  soft: { face: '#F7EFE3', edge: '#E3D4BD', text: A.ink },
  flame: { face: A.flame, edge: A.flameEdge, text: A.ink },
  ink: { face: '#2B2B2B', edge: '#000000', text: '#FFFFFF' },
}

/**
 * The 3D push. Josh Comeau's recipe: a solid edge layer sits `depth` px below
 * the face. Press drops the face onto it in 34ms; release springs back.
 */
export function Push({
  tone = 'tile',
  depth = 5,
  radius = R.md,
  className = '',
  faceClassName = '',
  pressed = false,
  children,
  ...rest
}: {
  tone?: Tone
  depth?: number
  radius?: number
  className?: string
  faceClassName?: string
  pressed?: boolean
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const t = TONES[tone]
  return (
    <button
      type="button"
      className={`push group relative block shrink-0 cursor-pointer select-none outline-offset-4 focus-visible:outline-[3px] focus-visible:outline-[#1F1F1F] disabled:cursor-default ${className}`}
      style={{ borderRadius: radius, ['--d' as string]: `${depth}px` }}
      data-pressed={pressed ? '' : undefined}
      {...rest}
    >
      <PushEdge color={t.edge} radius={radius} />
      <span
        className={`push-face flex min-w-full items-center justify-center ${faceClassName}`}
        style={{ background: t.face, color: t.text, borderRadius: radius }}
      >
        {children}
      </span>
    </button>
  )
}

/** The solid edge under a push face. Goes first inside any `.push` element. */
export function PushEdge({ color, radius }: { color: string; radius: number | string }) {
  return <span aria-hidden className="push-edge" style={{ background: color, borderRadius: radius }} />
}

/** A static chunky surface (not tappable): same edge, no motion. */
export function Tile({ children, className = '', edge = A.tileEdge, face = A.tile, radius = R.lg }: { children: ReactNode; className?: string; edge?: string; face?: string; radius?: number }) {
  return (
    <div className={className} style={{ background: face, borderRadius: radius, boxShadow: `0 5px 0 ${edge}` }}>
      {children}
    </div>
  )
}

export function MerchantMark({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  const m = merchantMark(id, name)
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center font-black tracking-tight"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: m.color,
        color: m.ink,
        fontSize: m.mark.length > 2 ? size * 0.28 : size * 0.4,
        boxShadow: `0 3px 0 color-mix(in oklch, ${m.color} 70%, black)`,
      }}
    >
      {m.mark}
    </span>
  )
}

const NETWORK: Record<string, string> = { visa: 'VISA', amex: 'AMEX', mastercard: 'MC' }

export const cardEdge = (c: Card) => `color-mix(in oklch, ${c.gradient[1]} 72%, black)`

/** Card art: the team's SVG artwork with chunky type. */
export function CardArt({ card, mini = false, bare = false, corner }: { card: Card; mini?: boolean; bare?: boolean; corner?: ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ color: card.text_color, borderRadius: 'inherit' }}>
      <img src={`/cards/${card.type}.svg`} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      {bare ? null : mini ? (
        <span className="absolute left-2.5 top-2 text-[12px] font-extrabold leading-tight">{card.name}</span>
      ) : (
        <>
          <div className="absolute inset-x-5 top-4 flex items-start justify-between">
            <span className="text-[19px] font-black tracking-[-0.2px]">{card.name}</span>
            {corner ?? <span className="rounded-full bg-black/10 px-2 py-0.5 text-[12px] font-black tracking-[0.8px]">{NETWORK[card.network]}</span>}
          </div>
          <div className="absolute bottom-4 left-5 text-[15px] font-extrabold tracking-[2px] tabular-nums opacity-90">•••• {card.last4}</div>
        </>
      )}
    </div>
  )
}

/** Small progress ring for the HUD and the Rewards hero. */
export function Ring({ value, size, stroke, track = A.sunk, color = A.jade, children }: { value: number; size: number; stroke: number; track?: string; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, value) }}
          transition={{ type: 'spring', duration: 1, bounce: 0.15 }}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-1 pb-3">
      <h2 className="text-[20px] font-black tracking-[-0.2px]">{children}</h2>
      {right}
    </div>
  )
}

/** A list row inside a Tile. */
export function Row({
  leading,
  title,
  subtitle,
  trailing,
  last = false,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  last?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${last ? '' : 'border-b-2 border-[#F4EADB]'}`}>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-extrabold leading-[22px]">{title}</div>
        {subtitle ? <div className="truncate text-[14px] font-semibold leading-[19px] text-[#6B6257]">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
    </div>
  )
}

export const popSpring = { type: 'spring', duration: 0.5, bounce: 0.3 } as const
export const calmSpring = { type: 'spring', duration: 0.4, bounce: 0 } as const

/** Short card names for tight rows: "Everyday Debit" → "Debit". */
export const shortCard = (name: string) => name.replace(/^Everyday /, '').replace(/^Chase /, '')
