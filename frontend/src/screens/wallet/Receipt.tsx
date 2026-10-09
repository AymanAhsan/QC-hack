// Settlement beat: the screen darkens and a receipt slides up.
// "✔ Approved • Amex Gold Read • $42.50 Authorized (+170 pts)"

import { AnimatePresence, motion } from 'motion/react'
import { ApiError } from '../../api'
import { formatCents } from '../../lib/format'

export interface ReceiptData {
  cardName: string
  merchantName: string
  amountCents: number
  /** Points for points cards, null for cash-back cards */
  points: number | null
  valueCents: number
  save: { status: 'saving' } | { status: 'saved' } | { status: 'failed'; error: unknown }
}

function saveError(error: unknown): string {
  if (error instanceof ApiError && error.isNotImplemented) return 'Not added to history yet: purchase logging is waiting on another workstream.'
  if (error instanceof ApiError) return `Not added to history: ${error.message}`
  return 'Not added to history.'
}

export function Receipt({ data, onDone, onRetry }: { data: ReceiptData | null; onDone: () => void; onRetry: () => void }) {
  return (
    <AnimatePresence>
      {data && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDone}
        >
          <motion.div
            role="status"
            className="w-full max-w-sm rounded-3xl border border-emerald-400/25 bg-[#1c1c1e]/95 px-5 pb-4 pt-5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(74,222,128,0.12)]"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 text-[15px] font-semibold leading-snug">
              <span className="text-emerald-400">✔ Approved</span>
              <span className="text-white/30">•</span>
              <span>{data.cardName} Read</span>
              <span className="text-white/30">•</span>
              <span>
                {formatCents(data.amountCents)} Authorized{' '}
                <span className="text-emerald-400">
                  (+{data.points !== null ? `${data.points.toLocaleString()} pts` : `${formatCents(data.valueCents)} back`})
                </span>
              </span>
            </p>
            <p className="mt-2 text-xs text-white/45">{data.merchantName} · simulated payment, no card was charged</p>

            {data.save.status === 'saving' && <p className="mt-1.5 text-xs text-white/40">Adding to history…</p>}
            {data.save.status === 'saved' && <p className="mt-1.5 text-xs text-emerald-300/80">Added to your purchase history</p>}
            {data.save.status === 'failed' && (
              <div className="mt-1.5 text-xs text-amber-300">
                {saveError(data.save.error)}{' '}
                <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
                  Retry
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onDone}
              className="mt-4 w-full rounded-xl bg-white/10 py-2.5 text-[15px] font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
