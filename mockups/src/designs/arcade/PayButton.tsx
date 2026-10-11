import { useEffect } from 'react'
import { AnimatePresence, motion, useTransform } from 'motion/react'
import { CheckIcon, ContactlessPaymentIcon } from '@phosphor-icons/react'
import { useHoldToPay } from '../../shared/useHoldToPay'
import { A, PushEdge } from './ui'

const RING = 116
const STROKE = 9
const FACE = 88
const DEPTH = 7

/**
 * A round push button with a ring that fills while held. Holding keeps the
 * face pressed onto its edge; release early and the ring snaps back.
 */
export function PayButton({ cardName, onPaid }: { cardName: string; onPaid: () => void }) {
  const { progress, state, bind, reset } = useHoldToPay({ onComplete: onPaid })
  const ringOpacity = useTransform(progress, [0, 0.02], [0, 1])
  const r = (RING - STROKE) / 2

  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(reset, 2600)
    return () => clearTimeout(t)
  }, [state, reset])

  const label = state === 'done' ? 'Done' : state === 'holding' ? 'Keep holding…' : 'Hold to pay'
  const done = state === 'done'

  return (
    <div className="flex flex-col items-center">
      <div className="relative grid place-items-center" style={{ width: RING, height: RING }}>
        <svg viewBox={`0 0 ${RING} ${RING}`} width={RING} height={RING} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke="#F1E5D3" strokeWidth={STROKE} />
          <motion.circle
            cx={RING / 2}
            cy={RING / 2}
            r={r}
            fill="none"
            stroke={A.jadeEdge}
            strokeWidth={STROKE}
            strokeLinecap="round"
            style={{ pathLength: progress, opacity: ringOpacity }}
          />
        </svg>
        <button
          type="button"
          aria-label={`Hold to pay with ${cardName}`}
          aria-describedby="arcade-pay-caption"
          {...bind}
          data-pressed={state === 'holding' ? '' : undefined}
          className="push group relative rounded-full outline-offset-[6px] focus-visible:outline-[3px] focus-visible:outline-[#1F1F1F]"
          style={{ ...bind.style, width: FACE, ['--d' as string]: `${DEPTH}px` }}
        >
          <PushEdge color={A.jadeEdge} radius="9999px" />
          <span className="push-face grid place-items-center rounded-full" style={{ width: FACE, height: FACE, background: A.jade, color: A.ink }}>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.span key="done" initial={{ scale: 0.4, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', duration: 0.45, bounce: 0.5 }}>
                  <CheckIcon size={42} weight="bold" />
                </motion.span>
              ) : (
                <motion.span key="icon" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', duration: 0.3, bounce: 0 }}>
                  <ContactlessPaymentIcon size={40} weight="bold" />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </button>
      </div>
      <div className="flex h-7 items-center overflow-hidden pt-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            className="text-[19px] font-black"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      <p id="arcade-pay-caption" className="text-[13px] font-bold text-[#6B6257]">
        Simulated · no card is charged
      </p>
    </div>
  )
}
