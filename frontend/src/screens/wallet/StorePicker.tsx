// Bottom sheet of mock nearby stores, used to simulate "arriving" somewhere.

import { AnimatePresence, motion } from 'motion/react'
import type { Location } from '../../types'

interface Props {
  open: boolean
  locations: Location[]
  currentId: string | null
  onPick: (loc: Location) => void
  onClose: () => void
}

function distance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}

export function StorePicker({ open, locations, currentId, onPick, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Choose a store"
            className="max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[#1c1c1e] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-white/25" />
            <h2 className="mb-1 text-[17px] font-semibold">Nearby stores</h2>
            <p className="mb-2 text-xs text-white/45">Simulated locations · pick one to "arrive"</p>
            <ul>
              {locations.map((loc) => (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => onPick(loc)}
                    aria-current={loc.id === currentId ? 'true' : undefined}
                    className="flex w-full items-center gap-3 border-b border-white/[0.08] px-1 py-3 text-left hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-sky-400"
                  >
                    <span aria-hidden="true" className="text-xl">{loc.merchant.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {loc.merchant.name}
                        {loc.id === currentId && <span className="ml-1.5 text-[10px] text-cyan-400">●</span>}
                      </span>
                      <span className="block truncate text-[13px] text-white/45">{loc.address}</span>
                    </span>
                    <span className="shrink-0 text-xs text-white/40">{distance(loc.distance_m)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
