import { useEffect } from 'react'
import { AnimatePresence, motion, useTransform } from 'motion/react'
import { ContactlessPaymentIcon } from '@phosphor-icons/react'
import { useHoldToPay } from '../../shared/useHoldToPay'

/**
 * Circular hold-to-pay. White ring fills linearly while held, snaps back on
 * early release, floods with the money accent on completion.
 */
export function HoldRing({
  cardName,
  onPaid,
  size = 84,
  showCaption = true,
}: {
  cardName: string
  onPaid: () => void
  size?: number
  showCaption?: boolean
}) {
  const { progress, state, bind, reset } = useHoldToPay({ onComplete: onPaid })
  const ringOpacity = useTransform(progress, [0, 0.02], [0, 1])
  const r = size / 2 - 4

  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(reset, 2600)
    return () => clearTimeout(t)
  }, [state, reset])

  const label = state === 'done' ? 'Done' : state === 'holding' ? 'Keep holding…' : 'Hold to pay'

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        aria-label={`Hold to pay with ${cardName}`}
        {...bind}
        animate={{ scale: state === 'holding' ? 0.93 : 1 }}
        transition={{ type: 'spring', duration: 0.3, bounce: state === 'done' ? 0.45 : 0 }}
        className="relative grid place-items-center rounded-full bg-[#1A1E27] text-[#EEF0F4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#EEF0F4]"
        style={{ ...bind.style, width: size, height: size }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#EEF0F4"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ pathLength: progress, opacity: ringOpacity }}
          />
        </svg>
        <AnimatePresence initial={false}>
          {state === 'done' ? (
            <motion.span
              key="fill"
              className="absolute inset-0 rounded-full bg-[#9BE36D]"
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.35 }}
            />
          ) : null}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          {state === 'done' ? (
            <motion.svg key="check" viewBox="0 0 24 24" width={size * 0.36} height={size * 0.36} className="relative text-[#0B0D12]" aria-hidden>
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
              <ContactlessPaymentIcon size={size * 0.36} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <div className="flex h-[20px] items-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            className="text-[14px] font-semibold"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      {showCaption ? <p className="text-[12px] text-[#9BA3B1]">Simulated · no card is charged</p> : null}
    </div>
  )
}
