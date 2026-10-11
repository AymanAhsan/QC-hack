// The app's look: iOS 26 Wallet, refined. System type on a near-black graphite
// background, Liquid Glass on floating controls, flat translucent grouped
// lists (index.css). One display voice: SF Pro Rounded for titles and
// money (heavy, like Rainbow's wallet), SF Pro for everything you read.

import { Children, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Squircle } from '@squircle-js/react'
// Per-network entry points: the package's main entry pulls in every network's logos.
import { AmericanExpressFlatRoundedIcon } from 'react-svg-credit-card-payment-icons/americanexpress'
import { MastercardLogoIcon } from 'react-svg-credit-card-payment-icons/mastercard'
import { VisaLogoIcon } from 'react-svg-credit-card-payment-icons/visa'
import { ApiError } from '../api'
import type { CardEvaluation } from '../types'
import { money } from '../lib/format'
import { merchantMark, type CardLook } from '../lib/merchants'
import { CardMaterial, type Face } from './materials'

/** The floating tab bar's distance from the bottom edge (it clears the home indicator). */
export const BAR_BOTTOM = 'max(12px, calc(var(--sab) - 5px))'

export const press = { scale: 0.97 }
export const spring = { type: 'spring', duration: 0.45, bounce: 0.12 } as const
export const springSoft = { type: 'spring', duration: 0.5, bounce: 0 } as const

export function LargeTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between px-4 pb-2 pt-2.5">
      <h1 className="font-[family-name:var(--font-sf-rounded)] text-[36px] font-extrabold leading-[41px] tracking-[-0.2px]">{children}</h1>
      {right ? <div className="flex h-[41px] items-center gap-2">{right}</div> : null}
    </header>
  )
}

/** "+$3.06", or "No rewards" for a card that earns nothing (debit): never a green "+$0.00". */
export const earnLabel = (cents: number) => (cents > 0 ? `+${money(cents)}` : 'No rewards')

/** What a card earns at the current store, on the card's top row: green for the best card. */
export function StoreBadge({ ev, best }: { ev: CardEvaluation; best: boolean }) {
  return (
    <span
      className={`-my-1 rounded-full px-2.5 py-1 font-[family-name:var(--font-sf-rounded)] text-[13px] font-semibold tabular-nums ${
        ev.accepted && ev.value_cents > 0 ? (best ? 'bg-[#30D158] text-black' : 'bg-black/55 text-white') : 'bg-black/55 text-white/75'
      }`}
    >
      {ev.accepted ? earnLabel(ev.value_cents) : 'Not accepted'}
    </span>
  )
}

/** Liquid-Glass-style floating control. Only used where content scrolls underneath. */
export function GlassButton({
  label,
  onClick,
  children,
  ...rest
}: { label: string; onClick?: () => void; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
      className="n-glass grid size-11 place-items-center rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-white/70"
      {...(rest as object)}
    >
      {children}
    </motion.button>
  )
}

export function Section({ title, children, footer, action }: { title?: string; children: ReactNode; footer?: ReactNode; action?: ReactNode }) {
  return (
    <section className="px-4">
      {title ? (
        <div className="flex items-baseline justify-between px-1 pb-2">
          <h2 className="font-[family-name:var(--font-sf-rounded)] text-[21px] font-bold leading-[25px]">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="n-panel overflow-hidden rounded-[20px]"><Stagger>{children}</Stagger></div>
      {footer ? <p className="px-4 pt-2 text-[13px] leading-[18px] text-[rgba(235,235,245,0.6)]">{footer}</p> : null}
    </section>
  )
}

// Rows arrive in a short stagger when a list first appears.
const ROW_IN = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', duration: 0.4, bounce: 0 } },
} as const

function Stagger({ children }: { children: ReactNode }) {
  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.035 } } }}>
      {Children.map(children, (child) => (child == null ? child : <motion.div variants={ROW_IN}>{child}</motion.div>))}
    </motion.div>
  )
}

/** Inset grouped-list row. The separator starts after the leading icon, like iOS. */
export function Row({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  chevron = false,
  last = false,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  chevron?: boolean
  last?: boolean
}) {
  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className={`flex min-w-0 flex-1 items-center gap-3 py-[11px] pr-4 ${last ? '' : 'shadow-[inset_0_-0.5px_0_rgba(84,84,88,0.6)]'}`}>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] leading-[22px]">{title}</div>
          {subtitle ? <div className="truncate text-[15px] leading-[20px] text-[rgba(235,235,245,0.6)]">{subtitle}</div> : null}
        </div>
        {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
        {chevron ? (
          <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden className="shrink-0 text-[rgba(235,235,245,0.3)]">
            <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </div>
    </>
  )
  const cls = 'flex w-full items-center gap-3 pl-4 text-left'
  return onClick ? (
    // A soft spring press on every tappable row.
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', duration: 0.3, bounce: 0.3 }}
      className={`${cls} transition-colors duration-150 active:bg-white/[0.08] focus-visible:bg-white/[0.08] focus-visible:outline-none`}
    >
      {body}
    </motion.button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** Merchants with a logo in public/logos: each company's App Store icon (Trader Joe's has no app, so its site icon). */
const LOGOS = new Set([
  'airbnb', 'capital-one-travel', 'chase-travel', 'chipotle', 'costco', 'cvs', 'delta', 'doordash', 'hm', 'lululemon',
  'marriott', 'nike', 'shell', 'starbucks', 'sweetgreen', 'target', 'trader-joes', 'ubereats', 'uniqlo', 'whole-foods',
  'adidas', 'aldi', 'amazon', 'american-airlines', 'apple', 'barnes-and-noble', 'best-buy', 'bjs', 'bp', 'burger-king',
  'chevron', 'chick-fil-a', 'dollar-general', 'dominos', 'dunkin', 'expedia', 'exxon', 'foot-locker', 'gap', 'grubhub',
  'hilton', 'home-depot', 'hyatt', 'ikea', 'jetblue', 'kroger', 'levis', 'lowes', 'macys', 'mcdonalds', 'nordstrom',
  'old-navy', 'panera', 'publix', 'safeway', 'sams-club', 'sephora', 'shake-shack', 'southwest', 'stop-and-shop',
  'subway', 'taco-bell', 'tj-maxx', 'uber', 'ulta', 'united', 'urban-outfitters', 'walgreens', 'walmart', 'wegmans',
  'wendys', 'zara',
])

export function MerchantMark({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  if (LOGOS.has(id)) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}logos/${id}.webp`}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="shrink-0 select-none outline-1 -outline-offset-1 outline-white/10"
        style={{ width: size, height: size, borderRadius: size * 0.225 }}
      />
    )
  }
  const m = merchantMark(id, name)
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold tracking-tight"
      style={{ width: size, height: size, background: m.color, color: m.ink, fontSize: m.mark.length > 2 ? size * 0.3 : size * 0.38 }}
    >
      {m.mark}
    </span>
  )
}

/**
 * Cards with the issuer's real card design in public/card-art (see CREDITS.md).
 * The design already carries the bank and network logos, so only the store
 * badge and the last four go on top. `badge: 'left'` keeps it off a logo.
 */
const ART: Record<string, { badge?: 'left' }> = {
  'amex-gold': {},
  'chase-sapphire': {},
  'chase-freedom': {},
  'venture-x': { badge: 'left' },
  'apple-card': {},
  'everyday-debit': {},
}

// Every other card follows Untitled UI's CreditCard (MIT, github.com/untitleduico/react):
// a flat two-tone fill, a 1px edge highlight that fades out from the top-left,
// network logo bottom-right. The fills also show while a card's art loads.
const FACES: Record<string, Face> = {
  'amex-gold': { from: '#A08250', to: '#CFB685', glint: '#F6E4B4', ink: '#1E1709', ring: 'rgba(255,255,255,0.45)', mark: 'dark' },
  'chase-sapphire': { from: '#0B1830', to: '#22406F', glint: '#6B93D6', ink: '#FFFFFF', ring: 'rgba(255,255,255,0.28)', mark: 'light' },
  'chase-freedom': { from: '#1B4FA3', to: '#4285DA', glint: '#A5CEFF', ink: '#FFFFFF', ring: 'rgba(255,255,255,0.32)', mark: 'light' },
  'venture-x': { from: '#131315', to: '#38383E', glint: '#9A9AA3', ink: '#FFFFFF', ring: 'rgba(255,255,255,0.26)', mark: 'light' },
  'apple-card': { from: '#E2E2E6', to: '#FFFFFF', glint: '#FFFFFF', ink: '#1C1C1E', ring: 'rgba(0,0,0,0.08)', mark: 'dark' },
  'everyday-debit': { from: '#082A5C', to: '#0D5BB0', glint: '#6FA8E6', ink: '#FFFFFF', ring: 'rgba(255,255,255,0.28)', mark: 'light' },
}

function faceFor(card: CardLook): Face {
  const known = FACES[card.type]
  if (known) return known
  const light = card.text_color.toLowerCase() !== '#ffffff'
  return { from: card.gradient[1], to: card.gradient[0], glint: card.glow, ink: card.text_color, ring: light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.28)', mark: light ? 'dark' : 'light' }
}

/** Visa prints as a one-color mark; Amex as its blue box; Mastercard keeps its circles. */
function NetworkLogo({ network, mark }: { network: CardLook['network']; mark: Face['mark'] }) {
  if (network === 'amex') return <AmericanExpressFlatRoundedIcon className="h-auto w-[12cqw]" />
  return (
    <span
      className="grid h-[8.4cqw] w-[12cqw] place-items-center rounded-[1.6cqw]"
      style={{ background: mark === 'light' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
    >
      {network === 'mastercard' ? (
        <MastercardLogoIcon className="h-auto w-[9cqw]" />
      ) : (
        <VisaLogoIcon className={`h-auto w-[9cqw] brightness-0 ${mark === 'light' ? 'invert' : 'opacity-80'}`} />
      )}
    </span>
  )
}

/** A payment card. Type and logo scale with the card's width (container units). */
export function CardFace({
  card,
  compact = false,
  className = '',
  badge,
  radius,
  live = false,
}: {
  card: CardLook
  compact?: boolean
  className?: string
  /** Shown at the end of the top row (e.g. earnings at this store). */
  badge?: React.ReactNode
  radius?: number
  /** Render the card's live iridescent surface (cards without art only). Keep it to one card on screen. */
  live?: boolean
}) {
  const f = faceFor(card)
  const art = ART[card.type]
  const r = radius ?? (compact ? 6 : 16)
  const squircle = !compact
  const face = (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        color: f.ink,
        borderRadius: squircle ? 0 : r,
        background: `linear-gradient(to top right, ${f.from}, ${f.to})`,
        containerType: 'inline-size',
      }}
    >
      {art ? (
        <img
          src={`${import.meta.env.BASE_URL}card-art/${card.type}.webp`}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : live ? (
        <CardMaterial face={f} />
      ) : null}
      {compact ? null : art ? (
        <div className="absolute inset-0 flex flex-col justify-between p-[5cqw]">
          <div className={`flex ${art.badge === 'left' ? 'justify-start' : 'justify-end'}`}>{badge}</div>
          <span
            className="self-start text-[4.2cqw] font-semibold tabular-nums tracking-[0.08em]"
            style={{ textShadow: f.mark === 'light' ? '0 1px 2px rgb(0 0 0 / 0.45)' : undefined }}
          >
            •••• {card.last4}
          </span>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-[5cqw]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[4.75cqw] font-semibold leading-[1.3] tracking-[-0.01em]">{card.name}</span>
            {badge}
          </div>
          <div className="flex items-end justify-between">
            <span className="text-[4.2cqw] font-semibold tabular-nums tracking-[0.06em]">•••• {card.last4}</span>
            <NetworkLogo network={card.network} mark={f.mark} />
          </div>
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: `inset 0 0 0 1px ${f.ring}`, maskImage: 'linear-gradient(135deg, #000, rgb(0 0 0 / 0.2))' }}
      />
    </div>
  )
  // iOS continuous corners: a clip-path squircle (Figma's 60% smoothing) instead of a circular radius.
  return squircle ? (
    <Squircle asChild cornerRadius={r * 1.15} cornerSmoothing={0.6}>
      {face}
    </Squircle>
  ) : (
    face
  )
}

// Microsoft Fluent Emoji 3D (MIT, github.com/microsoft/fluentui-emoji), self-hosted in public/emoji.
// One icon set for every illustrated moment; Phosphor stays for UI glyphs.
export type EmojiName =
  | 'airplane'
  | 'bullseye'
  | 'coin'
  | 'credit-card'
  | 'fire'
  | 'hamburger'
  | 'light-bulb'
  | 'money-bag'
  | 'party-popper'
  | 'receipt'
  | 't-shirt'
  | 'ticket'
  | 'trophy'

/** A decorative 3D emoji. `pop` springs it in, for moments that just happened. */
export function Emoji({ name, size = 28, pop = false, className = '' }: { name: EmojiName; size?: number; pop?: boolean; className?: string }) {
  const props = {
    src: `${import.meta.env.BASE_URL}emoji/${name}.png`,
    alt: '',
    width: size,
    height: size,
    draggable: false,
    className: `pointer-events-none shrink-0 select-none ${className}`,
  }
  return pop ? (
    <motion.img {...props} initial={{ scale: 0.4, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.5 }} />
  ) : (
    <img {...props} />
  )
}

export function Caption({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-[18px] text-[rgba(235,235,245,0.6)]">{children}</p>
}

/** A failed request, in plain words, with a way to try again. */
export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong.'
  return (
    <div role="alert" className="n-panel flex items-center gap-3 rounded-[20px] px-4 py-3 text-[15px]">
      <p className="min-w-0 flex-1 text-[rgba(235,235,245,0.8)]">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="min-h-11 shrink-0 text-[15px] font-semibold text-[#0A84FF]">
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="py-10 text-center text-[15px] text-[rgba(235,235,245,0.6)]">
      <span className="n-shimmer">{label}</span>
    </p>
  )
}
