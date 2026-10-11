// Sticker: a neo-brutalist zine. Paper, ink, one signal orange, green only for
// money gained. 2px ink outlines and hard offset shadows on things you can press.
// Rotation is reserved for three things: the fanned hand, the "Best here"
// sticker, and the MAXED stamp. Everything else sits square on the grid.

import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { merchantMark, type Card } from '../../data/data'

export const S = {
  paper: '#F3EFE6',
  paper2: '#FBF8F1',
  ink: '#111111',
  ink2: '#4A4741',
  accent: '#FF5B1F',
  green: '#0E7A45',
  red: '#B42318',
}

export const FONT = 'font-[family-name:var(--font-bricolage)]'
export const MONO = 'font-[family-name:var(--font-mono)]'

const pressSpring = { type: 'spring', duration: 0.18, bounce: 0 } as const

/** Pressable with a hard shadow that collapses as the element moves into it. */
export function Press({
  depth = 3,
  className = '',
  children,
  ...rest
}: { depth?: number; className?: string; children: ReactNode } & HTMLMotionProps<'button'>) {
  return (
    <motion.button
      type="button"
      initial={false}
      whileTap={{ x: depth, y: depth, boxShadow: `0px 0px 0 ${S.ink}` }}
      transition={pressSpring}
      style={{ boxShadow: `${depth}px ${depth}px 0 ${S.ink}` }}
      className={`outline-offset-[3px] focus-visible:outline-2 focus-visible:outline-[#111] ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export function Btn({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: { variant?: 'primary' | 'secondary'; className?: string; children: ReactNode } & HTMLMotionProps<'button'>) {
  const v = variant === 'primary' ? 'bg-[#FF5B1F]' : 'bg-[#FBF8F1]'
  return (
    <Press className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-full border-2 border-[#111] text-[17px] font-extrabold text-[#111] disabled:opacity-40 ${v} ${className}`} {...rest}>
      {children}
    </Press>
  )
}

export function IconBtn({ label, children, className = '', ...rest }: { label: string; children: ReactNode; className?: string } & HTMLMotionProps<'button'>) {
  return (
    <Press aria-label={label} className={`grid size-11 place-items-center rounded-[12px] border-2 border-[#111] bg-[#FBF8F1] text-[#111] ${className}`} {...rest}>
      {children}
    </Press>
  )
}

/** Underlined ink text action. */
export function LinkBtn({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`min-h-11 px-1 text-[16px] font-bold underline decoration-2 underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#111] active:opacity-60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Title({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pb-4 pt-2">
      <h1 className={`${FONT} text-[46px] font-extrabold leading-[0.9] tracking-[-0.035em] [font-stretch:82%]`}>{children}</h1>
      {right ? <div className="flex items-center gap-2 pb-0.5">{right}</div> : null}
    </header>
  )
}

/** Outlined box. `raised` adds the hard shadow for things that stand out. */
export function Box({ children, className = '', raised = false }: { children: ReactNode; className?: string; raised?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-[14px] border-2 border-[#111] bg-[#FBF8F1] ${raised ? 'shadow-[4px_4px_0_#111]' : ''} ${className}`}>{children}</div>
  )
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`px-1 pb-2 text-[13px] font-extrabold uppercase tracking-[0.12em] ${className}`}>{children}</h2>
}

export function Row({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  first = false,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  first?: boolean
}) {
  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-bold leading-[21px]">{title}</div>
        {subtitle ? <div className="truncate text-[14px] leading-[19px] text-[#4A4741]">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
    </>
  )
  const cls = `flex w-full min-h-[60px] items-center gap-3 px-3.5 py-2.5 text-left ${first ? '' : 'border-t border-[#111]'}`
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-colors duration-150 active:bg-[#FF5B1F]/15 focus-visible:bg-[#FF5B1F]/15 focus-visible:outline-none`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function MerchantMark({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  const m = merchantMark(id, name)
  return (
    <span
      aria-hidden
      className={`${FONT} grid shrink-0 place-items-center rounded-[10px] border-2 border-[#111] font-extrabold tracking-tight`}
      style={{ width: size, height: size, background: m.color, color: m.ink, fontSize: m.mark.length > 2 ? size * 0.28 : size * 0.38 }}
    >
      {m.mark}
    </span>
  )
}

/** The "Best here" sticker. One of the three rotated things in this design. */
export function Sticker({ children, className = '', tone = 'accent' }: { children: ReactNode; className?: string; tone?: 'accent' | 'paper' }) {
  return (
    <span
      className={`inline-block rotate-[7deg] rounded-[7px] border-2 border-[#111] px-2 py-[3px] text-[12px] font-extrabold uppercase leading-none tracking-[0.08em] text-[#111] shadow-[2px_2px_0_#111] ${
        tone === 'accent' ? 'bg-[#FF5B1F]' : 'bg-[#FBF8F1]'
      } ${className}`}
    >
      {children}
    </span>
  )
}

/** Flat tag that sits square: demo labels, statuses. */
export function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 border-[#111] bg-[#FBF8F1] px-2.5 py-[3px] text-[12px] font-extrabold uppercase tracking-[0.08em] ${className}`}>
      {children}
    </span>
  )
}

/**
 * Rubber stamp. Slams in from 1.5× and settles at −8°. `still` renders it
 * without the entrance (list rows). Paper fill keeps it legible over card art.
 */
export function Stamp({ kind = 'maxed', size = 'lg', still = false }: { kind?: 'maxed' | 'paid'; size?: 'sm' | 'md' | 'lg'; still?: boolean }) {
  const color = kind === 'maxed' ? S.green : S.ink
  const dims = size === 'lg' ? 'text-[34px] px-3.5 py-1 border-[4px] rounded-[10px]' : size === 'md' ? 'text-[22px] px-2.5 py-0.5 border-[3px] rounded-[8px]' : 'text-[11px] px-1.5 py-0 border-2 rounded-[5px]'
  return (
    <motion.span
      aria-label={kind === 'maxed' ? 'Maxed' : 'Paid'}
      role="img"
      initial={still ? false : { scale: 1.55, rotate: -15, opacity: 0 }}
      animate={{ scale: 1, rotate: -8, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.42, bounce: 0.32 }}
      className={`${FONT} inline-block select-none bg-[#FBF8F1]/92 font-extrabold uppercase leading-[1.05] tracking-[0.14em] [font-stretch:80%] ${dims}`}
      style={{
        color,
        borderColor: color,
        boxShadow: size === 'sm' ? 'none' : `3px 3px 0 ${S.ink}`,
        filter: 'url(#stk-rough)',
      }}
    >
      {kind === 'maxed' ? 'Maxed' : 'Paid'}
    </motion.span>
  )
}

/** Hidden SVG filter that gives stamps a worn, inked edge. */
export function RoughFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <filter id="stk-rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.6 2.15" result="mask" />
        <feComposite in="SourceGraphic" in2="mask" operator="in" />
      </filter>
    </svg>
  )
}

// ---------------------------------------------------------------- card art

const NETWORK: Record<string, string> = { visa: 'VISA', amex: 'AMEX', mastercard: 'MC' }

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Ink or paper, whichever reads better on the card's flat color. */
export function cardInk(card: Card) {
  const L = luminance(card.gradient[0])
  const vsInk = (L + 0.05) / (luminance(S.ink) + 0.05)
  const vsPaper = (luminance(S.paper2) + 0.05) / (L + 0.05)
  return vsInk >= vsPaper ? S.ink : S.paper2
}

/**
 * Portrait card, flat color, ink outline. Type scales with the card's width
 * (font-size is set in px from `width`), so the same art works in the hand,
 * in detail, and as a thumbnail.
 */
export function CardArt({ card, width, dim = false }: { card: Card; width: number; dim?: boolean }) {
  const fg = cardInk(card)
  const radius = Math.max(4, Math.round(width * 0.075))
  return (
    <div
      className={`${FONT} relative h-full w-full overflow-hidden`}
      style={{
        background: card.gradient[0],
        color: fg,
        borderRadius: radius,
        boxShadow: `inset 0 0 0 ${width < 60 ? 1.5 : 2}px ${S.ink}`,
        fontSize: width * 0.078,
        filter: dim ? 'grayscale(1) contrast(0.9)' : undefined,
        opacity: dim ? 0.55 : 1,
      }}
    >
      {/* halftone corner */}
      <div
        aria-hidden
        className="absolute -bottom-[10%] -right-[10%] h-[62%] w-[85%]"
        style={{
          backgroundImage: `radial-gradient(${fg === S.ink ? 'rgba(17,17,17,0.22)' : 'rgba(251,248,241,0.22)'} 22%, transparent 26%)`,
          backgroundSize: '0.62em 0.62em',
          maskImage: 'radial-gradient(circle at 100% 100%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 100% 100%, black 20%, transparent 70%)',
        }}
      />
      {width >= 60 ? (
        <>
          {/* Name runs down the left edge like a spine: the strip that stays visible in a fanned hand. */}
          <div
            className="absolute bottom-[24%] left-[7%] top-[6%] overflow-hidden text-ellipsis whitespace-nowrap text-[1.5em] font-extrabold leading-none tracking-[-0.01em] [font-stretch:80%] [writing-mode:vertical-rl]"
          >
            {card.name}
          </div>
          <div className="absolute right-[8%] top-[5%] text-[1.15em] font-extrabold italic tracking-[0.02em]">{NETWORK[card.network]}</div>
          <div
            aria-hidden
            className="absolute right-[9%] top-[40%] h-[1.05em] w-[1.45em] rounded-[0.22em]"
            style={{ boxShadow: `inset 0 0 0 0.12em ${fg}`, opacity: 0.85 }}
          >
            <div className="absolute inset-x-0 top-1/2 h-[0.1em] -translate-y-1/2" style={{ background: fg }} />
          </div>
          <div className={`${MONO} absolute bottom-[5%] right-[8%] text-[0.92em] font-semibold tracking-[0.06em]`}>•••• {card.last4}</div>
        </>
      ) : null}
    </div>
  )
}

export const CARD_RATIO = 340 / 214 // height / width for portrait cards

/** Network names for honest rejection copy ("Costco doesn't take Amex"). */
export const NETWORK_NAME: Record<string, string> = { visa: 'Visa', amex: 'Amex', mastercard: 'Mastercard' }

/** The engine labels rejections "rejected by X terminal"; say it plainly instead. */
export function plainRejection(label: string, storeName: string) {
  const m = label.match(/^(\w+) rejected by/)
  return m ? `${storeName} doesn't take ${m[1]}` : label
}
