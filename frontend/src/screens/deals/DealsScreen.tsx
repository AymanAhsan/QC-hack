// Deals screen slot. Owner: Nazeef — replace this stub with the full Deals experience.
// It demonstrates the contract: GET /api/deals, and nav.openScan() to hand a deal to Scan.

import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useNav } from '../../navigation'
import type { DealCategory, DealFeed } from '../../types'
import { formatPct } from '../../lib/format'
import { DemoBadge, ErrorNotice, Loading, ScreenHeader } from '../../components/ui'

export function DealsScreen() {
  const { openScan } = useNav()
  const [categories, setCategories] = useState<DealCategory[] | null>(null)
  const [active, setActive] = useState<DealFeed>('meals')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    api.deals(undefined, ctrl.signal).then((r) => setCategories(r.categories), (e) => !ctrl.signal.aborted && setError(e))
    return () => ctrl.abort()
  }, [])

  const current = categories?.find((c) => c.id === active)
  return (
    <section>
      <ScreenHeader title="Deals" subtitle={<DemoBadge>Demo coupons · not verified offers</DemoBadge>} />
      {error ? <ErrorNotice error={error} /> : null}
      {!categories && !error && <Loading />}
      {categories && (
        <div role="tablist" className="mb-3 flex gap-2">
          {categories.map((c) => (
            <button key={c.id} role="tab" type="button" aria-selected={c.id === active} onClick={() => setActive(c.id)} className={`rounded-full px-3 py-1.5 text-sm ${c.id === active ? 'bg-white text-black' : 'bg-white/10'}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {current?.deals.map((d) => (
          <li key={d.merchant.id}>
            <button type="button" onClick={() => openScan({ merchantId: d.merchant.id, subtotalCents: d.example_subtotal_cents })} className="w-full rounded-2xl bg-white/5 p-3 text-left hover:bg-white/10">
              <div className="flex justify-between font-medium">
                <span>{d.merchant.emoji} {d.merchant.name}</span>
                <span className="text-emerald-300">{formatPct(d.total_value_pct)}</span>
              </div>
              <p className="text-xs text-white/55">{d.headline}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
