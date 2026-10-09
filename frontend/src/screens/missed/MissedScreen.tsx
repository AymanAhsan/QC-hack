// Missed screen slot. Owner: Ayman — replace this stub with the full Missed experience.
// It demonstrates the contract: GET /api/missed, refetching when nav.transactionsVersion changes.

import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useNav } from '../../navigation'
import type { MissedResponse } from '../../types'
import { formatCents } from '../../lib/format'
import { DemoBadge, ErrorNotice, Loading, ScreenHeader } from '../../components/ui'

export function MissedScreen() {
  const { transactionsVersion } = useNav()
  const [data, setData] = useState<MissedResponse | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setError(null)
    api.missed({}, ctrl.signal).then(setData, (e) => !ctrl.signal.aborted && setError(e))
    return () => ctrl.abort()
  }, [transactionsVersion])

  return (
    <section>
      <ScreenHeader title="Missed" subtitle={<DemoBadge>Simulated purchase history</DemoBadge>} />
      {error ? <ErrorNotice error={error} /> : null}
      {!data && !error && <Loading />}
      {data && (
        <p className="text-lg">
          You missed <strong className="text-red-300">{formatCents(data.total_missed_cents)}</strong> in rewards ({data.window_label.toLowerCase()}).
        </p>
      )}
    </section>
  )
}
