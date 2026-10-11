import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react'
import { CaretLeftIcon, CaretRightIcon, LockSimpleIcon, SealCheckIcon } from '@phosphor-icons/react'
import type { Card } from '../../data/data'
import { playTick } from '../../shared/feedback'
import { CardArt } from './ui'

const RATIO = 214 / 340
const GAP = 14
const snap = { type: 'spring', duration: 0.5, bounce: 0.16 } as const

/**
 * Character select. The track follows the finger 1:1; on release a spring
 * seeded with the fling velocity lands on the nearest card (projected by
 * velocity, so a flick skips ahead). Side cards shrink and dim by distance.
 */
export function Carousel({
  cards,
  index,
  onIndex,
  onOpen,
  width,
  recommendedId,
  lockedIds,
}: {
  cards: Card[]
  index: number
  onIndex: (i: number) => void
  onOpen: (card: Card) => void
  width: number
  recommendedId: string | null
  lockedIds: Set<string>
}) {
  const W = Math.min(286, width - 104)
  const H = Math.round(W * RATIO)
  const STEP = W + GAP
  const x = useMotionValue(-index * STEP)
  const velocity = useRef(0)
  const dragged = useRef(false)

  useEffect(() => {
    animate(x, -index * STEP, { ...snap, velocity: velocity.current })
    velocity.current = 0
  }, [index, STEP, x])

  const go = (i: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, i))
    if (next !== index) playTick()
    onIndex(next)
  }

  return (
    <div className="relative" style={{ height: H + 34 }}>
      {/* Taller than the slot so the selected card's glow shadow isn't clipped. */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-14 top-0 overflow-hidden">
        <motion.div
          className="pointer-events-auto absolute top-[22px] flex cursor-grab touch-pan-y active:cursor-grabbing"
          style={{ x, left: (width - W) / 2, gap: GAP }}
          drag="x"
          dragConstraints={{ left: -(cards.length - 1) * STEP, right: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragStart={() => {
            dragged.current = true
          }}
          onDragEnd={(_, info) => {
            const projected = x.get() + info.velocity.x * 0.2
            const i = Math.max(0, Math.min(cards.length - 1, Math.round(-projected / STEP)))
            velocity.current = info.velocity.x
            if (i === index) animate(x, -i * STEP, { ...snap, velocity: info.velocity.x })
            else go(i)
            setTimeout(() => (dragged.current = false), 0)
          }}
        >
          {cards.map((c, i) => (
            <Slot
              key={c.id}
              card={c}
              i={i}
              x={x}
              step={STEP}
              w={W}
              h={H}
              active={i === index}
              recommended={c.id === recommendedId}
              locked={lockedIds.has(c.id)}
              onClick={() => {
                if (dragged.current) return
                if (i === index) onOpen(c)
                else go(i)
              }}
            />
          ))}
        </motion.div>
      </div>

      <StepButton side="left" disabled={index === 0} onClick={() => go(index - 1)} />
      <StepButton side="right" disabled={index === cards.length - 1} onClick={() => go(index + 1)} />
    </div>
  )
}

function Slot({
  card,
  i,
  x,
  step,
  w,
  h,
  active,
  recommended,
  locked,
  onClick,
}: {
  card: Card
  i: number
  x: MotionValue<number>
  step: number
  w: number
  h: number
  active: boolean
  recommended: boolean
  locked: boolean
  onClick: () => void
}) {
  const d = useTransform(x, (v) => (v + i * step) / step)
  const scale = useTransform(d, [-1, 0, 1], [0.84, 1, 0.84])
  const opacity = useTransform(d, [-1.4, 0, 1.4], [0.38, 1, 0.38])
  return (
    <motion.div className="relative shrink-0" style={{ width: w, height: h, scale, opacity }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={active ? `${card.name} ending ${card.last4}. Open card` : `Select ${card.name}`}
        aria-current={active ? 'true' : undefined}
        tabIndex={active ? 0 : -1}
        className="block h-full w-full rounded-[16px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#EEF0F4]"
        style={{ boxShadow: active ? `0 24px 48px -20px ${card.glow}AA, 0 10px 24px rgba(0,0,0,0.5)` : '0 10px 24px rgba(0,0,0,0.5)' }}
      >
        <CardArt card={card} locked={locked} />
        {locked ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[13px] font-semibold text-[#EEF0F4] backdrop-blur-sm">
              <LockSimpleIcon size={14} weight="bold" /> Not accepted here
            </span>
          </span>
        ) : null}
      </button>
      {recommended ? (
        <span className="pointer-events-none absolute -top-[13px] left-3 flex items-center gap-1 rounded-full bg-[#EEF0F4] px-2.5 py-[5px] text-[12px] font-semibold text-[#0B0D12] shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <SealCheckIcon size={14} weight="fill" /> Recommended
        </span>
      ) : null}
    </motion.div>
  )
}

function StepButton({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? CaretLeftIcon : CaretRightIcon
  return (
    <motion.button
      type="button"
      aria-label={side === 'left' ? 'Previous card' : 'Next card'}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
      className={`absolute top-1/2 z-10 mt-[11px] grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[#0B0D12]/70 text-[#EEF0F4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-md outline-offset-2 transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-[#EEF0F4] disabled:opacity-0 ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
    >
      <Icon size={18} weight="bold" />
    </motion.button>
  )
}
