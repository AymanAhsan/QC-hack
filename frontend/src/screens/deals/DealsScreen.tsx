// Deals: today's best stacks by category. Tapping one opens it in Scan through
// the shared navigation contract. Owner: Nazeef.

import { useEffect, useState, type KeyboardEvent } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { api } from '../../api'
import { useNav } from '../../navigation'
import type { DealCategory, DealFeed } from '../../types'
import { DemoBadge, ErrorNotice, Loading, ScreenHeader } from '../../components/ui'
import { DealCard } from './DealCard'

export function DealsScreen() {
  const { openScan } = useNav()
  const [categories, setCategories] = useState<DealCategory[] | null>(null)
  const [active, setActive] = useState<DealFeed>('meals')
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setError(null)
    api.deals(undefined, ctrl.signal).then(
      (r) => setCategories(r.categories),
      (e) => !ctrl.signal.aborted && setError(e),
    )
    return () => ctrl.abort()
  }, [attempt])

  function onTabKey(e: KeyboardEvent, index: number) {
    if (!categories || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return
    const next = categories[(index + (e.key === 'ArrowRight' ? 1 : -1) + categories.length) % categories.length]
    setActive(next.id)
    document.getElementById(`deals-tab-${next.id}`)?.focus()
  }

  const current = categories?.find((c) => c.id === active)

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Deals">
        <ScreenHeader title="Deals" subtitle={<DemoBadge>Demo coupons · not verified offers</DemoBadge>} />
        {error ? <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} /> : null}
        {!categories && !error && <Loading />}
        {categories && (
          <>
            <div role="tablist" aria-label="Deal categories" className="mb-4 flex rounded-full bg-white/10 p-1 lg:max-w-lg">
              {categories.map((c, i) => {
                const selected = c.id === active
                return (
                  <button
                    key={c.id}
                    id={`deals-tab-${c.id}`}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls="deals-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(c.id)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={`relative flex-1 rounded-full py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                      selected ? 'text-black' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="deals-tab-pill"
                        className="absolute inset-0 rounded-full bg-white"
                        transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                      />
                    )}
                    <span className="relative">
                      <span aria-hidden="true">{c.emoji}</span> {c.label}
                    </span>
                  </button>
                )
              })}
            </div>
            <div id="deals-panel" role="tabpanel" aria-labelledby={`deals-tab-${active}`}>
              <p className="mb-3 text-xs text-white/45">Best coupon + best card in your wallet, at a typical order size. Tap one to open it in Scan.</p>
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {current?.deals.map((deal, i) => (
                  <li key={deal.merchant.id}>
                    <DealCard
                      deal={deal}
                      best={i === 0}
                      onOpen={() => openScan({ merchantId: deal.merchant.id, subtotalCents: deal.example_subtotal_cents })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </MotionConfig>
  )
}
