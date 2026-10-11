import { AnimatePresence, motion, useTransform } from 'motion/react'
import { ContactlessPaymentIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { TextMorph } from 'torph/react'
import { useHoldToPay } from '../../lib/useHoldToPay'

const R = 40
const SIZE = 92

/**
 * Circular hold-to-pay. Ring fills linearly while held; release early and it
 * snaps back. On completion the ring floods green and a check draws in.
 */
export function PayCircle({
  cardName,
  disabled,
  onPaid,
  resetAfter = 2600,
}: {
  cardName: string
  disabled?: boolean
  onPaid: () => void
  resetAfter?: number
}) {
  const { progress, state, bind, reset } = useHoldToPay({ onComplete: onPaid, disabled })
  const ringOpacity = useTransform(progress, [0, 0.02], [0, 1])

  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(reset, resetAfter)
    return () => clearTimeout(t)
  }, [state, reset, resetAfter])

  const label = state === 'done' ? 'Done' : state === 'holding' ? 'Keep holding…' : 'Hold to pay'

  return (
    <div className="flex flex-col items-center gap-2.5">
      <motion.button
        type="button"
        aria-label={`Hold to pay with ${cardName}`}
        disabled={disabled}
        {...bind}
        animate={{ scale: state === 'holding' ? 0.94 : 1 }}
        transition={{ type: 'spring', duration: 0.3, bounce: state === 'done' ? 0.4 : 0 }}
        className="n-glass relative grid place-items-center rounded-full text-white outline-offset-4 focus-visible:outline-2 focus-visible:outline-white/70 disabled:opacity-40"
        style={{ ...bind.style, width: SIZE, height: SIZE }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ pathLength: progress, opacity: ringOpacity }}
          />
        </svg>
        <AnimatePresence initial={false}>
          {state === 'done' ? (
            <motion.span
              key="done"
              className="absolute inset-0 rounded-full bg-[#30D158]"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.35 }}
            />
          ) : null}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          {state === 'done' ? (
            <motion.svg key="check" viewBox="0 0 24 24" width="34" height="34" className="relative text-black" aria-hidden>
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.08 }}
              />
            </motion.svg>
          ) : (
            <motion.span key="icon" className="relative" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <ContactlessPaymentIcon size={34} weight="regular" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <div className="flex h-[22px] items-center overflow-hidden">
        <TextMorph className="text-[17px] font-semibold" ease={{ stiffness: 320, damping: 30 }}>
          {label}
        </TextMorph>
      </div>
    </div>
  )
}
