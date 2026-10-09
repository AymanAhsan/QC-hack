// "Hold Near Terminal". Presentational: WalletScreen owns the state machine and
// timers; this reports press/release and draws the beat for the current phase.

import { motion } from 'motion/react'
import type { PayPhase } from './WalletScreen'

interface Props {
  phase: PayPhase
  disabled: boolean
  onHoldStart: () => void
  onHoldEnd: () => void
}

const SURFACE: Record<PayPhase, string> = {
  idle: 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] ring-white/10',
  located: 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] ring-white/10',
  scan: 'bg-gradient-to-br from-[#0d2b3e] to-[#0a3d5c] ring-cyan-400/25 shadow-[0_0_20px_rgba(0,210,255,0.15)]',
  read: 'bg-gradient-to-br from-[#0d2b3e] to-[#0a3d5c] ring-cyan-400/25',
  success: 'bg-gradient-to-br from-[#064e3b] to-[#065f46] ring-emerald-400/25 shadow-[0_0_30px_rgba(74,222,128,0.18)]',
  receipt: 'bg-gradient-to-br from-[#064e3b] to-[#065f46] ring-emerald-400/25',
}

const HINT: Record<PayPhase, string> = {
  idle: 'Pick a store first',
  located: 'Press and hold to pay',
  scan: 'Keep holding…',
  read: 'Keep holding…',
  success: 'Simulated payment · no card was charged',
  receipt: 'Simulated payment · no card was charged',
}

export function PayButton({ phase, disabled, onHoldStart, onHoldEnd }: Props) {
  const holding = phase === 'scan' || phase === 'read'
  const done = phase === 'success' || phase === 'receipt'
  const release = () => holding && onHoldEnd()

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-label="Hold near terminal to pay"
        onPointerDown={(e) => {
          if (disabled) return
          e.currentTarget.setPointerCapture(e.pointerId)
          onHoldStart()
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onBlur={release}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && !disabled) {
            e.preventDefault()
            onHoldStart()
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            release()
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative flex h-14 w-[260px] touch-none select-none items-center justify-center overflow-hidden rounded-full text-base font-bold tracking-wide text-white ring-1 transition-[transform,box-shadow] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${SURFACE[phase]}`}
      >
        {phase === 'scan' && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0">
            {[0, 0.5, 1].map((delay) => (
              <motion.span
                key={delay}
                className="absolute left-1/2 top-1/2 h-5 w-5 rounded-full border-2 border-cyan-400/60"
                style={{ x: '-50%', y: '-50%' }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 15, opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut', repeat: Infinity, delay }}
              />
            ))}
          </span>
        )}

        <span className="relative flex items-center gap-2.5">
          {phase === 'scan' && 'Searching for terminal…'}
          {phase === 'read' && (
            <>
              <svg viewBox="0 0 28 28" className="h-7 w-7 -rotate-90" aria-hidden="true">
                <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                <motion.circle
                  cx="14" cy="14" r="11" fill="none" stroke="rgba(0,210,255,0.85)" strokeWidth="3" strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </svg>
              Reading Card…
            </>
          )}
          {done && (
            <>
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-400/20 text-sm text-emerald-400"
              >
                ✔
              </motion.span>
              <span className="text-emerald-300">Approved</span>
            </>
          )}
          {(phase === 'idle' || phase === 'located') && '(( Hold Near Terminal ))'}
        </span>
      </button>
      <span className="text-xs tracking-wide text-white/40">{HINT[phase]}</span>
    </div>
  )
}
