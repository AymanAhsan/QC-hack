// Wallet screen slot. Owner: Yousef — replace this stub with the full Wallet experience.
// It demonstrates the contract: GET /api/locations, then GET /api/recommend.

import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Location, RecommendResponse } from '../../types'
import { formatCents, formatPct } from '../../lib/format'
import { DemoBadge, ErrorNotice, Loading, ScreenHeader } from '../../components/ui'

export function WalletScreen() {
  const [locations, setLocations] = useState<Location[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [rec, setRec] = useState<RecommendResponse | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    api.locations(ctrl.signal).then((r) => setLocations(r.locations), (e) => !ctrl.signal.aborted && setError(e))
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    if (!selected) return
    const ctrl = new AbortController()
    setRec(null)
    api.recommend(selected, undefined, ctrl.signal).then(setRec, (e) => !ctrl.signal.aborted && setError(e))
    return () => ctrl.abort()
  }, [selected])

  return (
    <section aria-labelledby="wallet-title">
      <ScreenHeader title="Wallet" subtitle={<DemoBadge>Simulated payments · demo cards</DemoBadge>} />
      {error ? <ErrorNotice error={error} /> : null}
      {!locations && !error && <Loading />}
      {locations && (
        <div className="flex gap-2 overflow-x-auto pb-3">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setSelected(loc.id)}
              aria-pressed={selected === loc.id}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${selected === loc.id ? 'bg-white text-black' : 'bg-white/10'}`}
            >
              {loc.merchant.emoji} {loc.merchant.name}
            </button>
          ))}
        </div>
      )}
      {rec && (
        <ol className="space-y-2">
          {rec.ranking.map((e) => (
            <li key={e.card_id} className={`rounded-2xl p-3 ${e.is_winner ? 'bg-white/15 ring-1 ring-emerald-400' : 'bg-white/5'} ${e.accepted ? '' : 'opacity-40'}`}>
              <div className="flex justify-between font-medium">
                <span>{e.card_name}</span>
                <span>{e.accepted ? formatPct(e.yield_pct) : '✖'}</span>
              </div>
              <p className="text-xs text-white/55">
                {e.accepted ? `${e.rate_label} · ${formatCents(e.value_cents)} on ${formatCents(rec.amount_cents)}` : e.rejection_reason}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
