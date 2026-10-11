import { useEffect } from 'react'
import { AnimatePresence, motion, useTransform } from 'motion/react'
import { ContactlessPaymentIcon } from '@phosphor-icons/react'
import { useHoldToPay } from '../../shared/useHoldToPay'

const SIZE = 84
const R = 39

/**
 * Ink disc, green ring. The ring is the only thing that moves while held; on
 * completion the disc floods green and a check draws in.
 */
export function PayButton({ cardName, onPaid, note }: { cardName: string; onPaid: () => void; note?: string | null }) {
  const { progress, state, bind, reset } = useHoldToPay({ onComplete: onPaid })
  const ringOpacity = useTransform(progress, [0, 0.02], [0, 1])

  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(reset, 2800)
    return () => clearTimeout(t)
  }, [state, reset])

  const label = state === 'done' ? 'Done' : state === 'holding' ? 'Keep holding…' : 'Hold to pay'

  return (
    <div className="flex items-center gap-5">
      <motion.button
        type="button"
        aria-label={`Hold to pay with ${cardName}`}
        aria-describedby="ledger-pay-caption"
        {...bind}
        animate={{ scale: state === 'holding' ? 0.94 : 1 }}
        transition={{ type: 'spring', duration: 0.3, bounce: state === 'done' ? 0.35 : 0 }}
        className="relative grid shrink-0 place-items-center rounded-full bg-[#141414] text-[#FAF9F6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141414]"
        style={{ ...bind.style, width: SIZE, height: SIZE }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden>
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#3DDC97"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ pathLength: progress, opacity: ringOpacity }}
          />
        </svg>
        <AnimatePresence initial={false}>
          {state === 'done' ? (
            <motion.span
              key="fill"
              className="absolute inset-0 rounded-full bg-[#0F7B4A]"
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
            />
          ) : null}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          {state === 'done' ? (
            <motion.svg key="check" viewBox="0 0 24 24" width="32" height="32" className="relative" aria-hidden>
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                fill="none"
                stroke="#FAF9F6"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.08 }}
              />
            </motion.svg>
          ) : (
            <motion.span key="icon" className="relative" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <ContactlessPaymentIcon size={32} weight="light" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <div className="min-w-0">
        <div className="relative h-[26px] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={label}
              className="text-[19px] font-semibold tracking-[-0.2px]"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            >
              {label}
            </motion.p>
          </AnimatePresence>
        </div>
        <p id="ledger-pay-caption" className="text-[14px] text-[#5E5D58]">
          Simulated · no card is charged
        </p>
        <AnimatePresence initial={false}>
          {note ? (
            <motion.p
              key={note}
              className="pt-1 text-[14px] font-medium text-[#0F7B4A]"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            >
              {note}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
