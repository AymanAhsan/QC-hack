import { AnimatePresence, motion, useTransform } from 'motion/react'
import { StampIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useHoldToPay } from '../../shared/useHoldToPay'
import { FONT, S } from './ui'

const BOX = 136
const R = 62

/**
 * The pay control is a stamp you press down and hold. The button sinks into
 * its hard shadow while held; an ink ring fills around it, linear, because it
 * shows time. Let go early and it springs back up.
 */
export function PayStamp({ cardName, onPaid, resetAfter = 2800 }: { cardName: string; onPaid: () => void; resetAfter?: number }) {
  const { progress, state, bind, reset } = useHoldToPay({ onComplete: onPaid })
  const ringOpacity = useTransform(progress, [0, 0.02], [0, 1])

  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(reset, resetAfter)
    return () => clearTimeout(t)
  }, [state, reset, resetAfter])

  const label = state === 'done' ? 'Done' : state === 'holding' ? 'Keep holding…' : 'Hold to pay'
  const down = state === 'holding'

  return (
    <div className="flex flex-col items-center">
      <div className="relative grid place-items-center" style={{ width: BOX, height: BOX }}>
        <svg viewBox={`0 0 ${BOX} ${BOX}`} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={BOX / 2} cy={BOX / 2} r={R} fill="none" stroke={S.ink} strokeOpacity="0.18" strokeWidth="6" strokeDasharray="1 7" strokeLinecap="round" />
          <motion.circle
            cx={BOX / 2}
            cy={BOX / 2}
            r={R}
            fill="none"
            stroke={S.ink}
            strokeWidth="6"
            strokeLinecap="round"
            style={{ pathLength: progress, opacity: ringOpacity }}
          />
        </svg>
        <motion.button
          type="button"
          aria-label={`Hold to pay with ${cardName}`}
          aria-describedby="stk-pay-caption"
          {...bind}
          initial={false}
          animate={{
            x: down ? 3 : 0,
            y: down ? 3 : 0,
            boxShadow: down ? `1px 1px 0 ${S.ink}` : `4px 4px 0 ${S.ink}`,
          }}
          transition={{ type: 'spring', duration: 0.22, bounce: state === 'done' ? 0.45 : 0 }}
          className="relative grid size-[104px] place-items-center overflow-hidden rounded-full border-2 border-[#111] bg-[#FF5B1F] outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#111]"
          style={bind.style}
        >
          <AnimatePresence initial={false}>
            {state === 'done' ? (
              <motion.span
                key="ink"
                aria-hidden
                className="absolute inset-0 rounded-full bg-[#0E7A45]"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              />
            ) : null}
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            {state === 'done' ? (
              <motion.svg key="check" viewBox="0 0 24 24" width="44" height="44" className="relative" aria-hidden>
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  fill="none"
                  stroke={S.paper2}
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1], delay: 0.06 }}
                />
              </motion.svg>
            ) : (
              <motion.span key="icon" className="relative" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.15 }}>
                <StampIcon size={44} weight="bold" color={S.ink} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
      <div className="flex h-[26px] items-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            className={`${FONT} text-[20px] font-extrabold tracking-[-0.01em]`}
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ type: 'spring', duration: 0.28, bounce: 0 }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      <p id="stk-pay-caption" className="text-[13px] font-semibold text-[#4A4741]">
        Simulated · no card is charged
      </p>
    </div>
  )
}
