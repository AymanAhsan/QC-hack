// Missed: trailing-window missed rewards, daily chart, categories, and history.
// Owner: Ayman (moved onto the shared api.ts / types.ts during integration).

import { useEffect, useState } from 'react'
import { api, ApiError } from '../../api'
import { useNav } from '../../navigation'
import type { MissedResponse } from '../../types'
import { formatCents } from '../../lib/format'
import { CountUp } from './CountUp'
import { DailyChart } from './DailyChart'
import './missed.css'

export type MissedLoader = (signal: AbortSignal) => Promise<MissedResponse>

const loadMissed: MissedLoader = (signal) => api.missed({}, signal)

/** Wired screen: refetches whenever a purchase is logged anywhere in the app. */
export function MissedScreen() {
  const { transactionsVersion } = useNav()
  const [cardNames, setCardNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const ctrl = new AbortController()
    api.wallet(ctrl.signal).then(
      (w) => setCardNames(Object.fromEntries(w.cards.map((c) => [c.id, c.name]))),
      () => {},
    )
    return () => ctrl.abort()
  }, [])

  return <MissedView loadMissed={loadMissed} refreshKey={transactionsVersion} cardNames={cardNames} />
}

interface MissedViewProps {
  loadMissed: MissedLoader
  /** Changes after Wallet or Scan logs a purchase. */
  refreshKey?: number
  cardNames?: Record<string, string>
}

export function MissedView({ loadMissed, refreshKey = 0, cardNames = {} }: MissedViewProps) {
  const [summary, setSummary] = useState<MissedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const cardName = (id: string | null) => (id ? (cardNames[id] ?? id) : 'No accepted card')

  useEffect(() => {
    const refresh = () => setRevision((previous) => previous + 1)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    loadMissed(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSummary(data)
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        setError(e instanceof ApiError && e.status !== 0 ? e.message : 'We couldn’t refresh your history. Try again.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [loadMissed, refreshKey, revision])

  const retry = () => setRevision((previous) => previous + 1)

  return (
    <section className="missed-screen" aria-labelledby="missed-title" aria-busy={loading}>
      <header className="missed-header">
        <div>
          <p className="missed-eyebrow">EVERY CARD COUNTS</p>
          <h1 id="missed-title">Cash back missed</h1>
        </div>
        <button className="missed-refresh" onClick={retry} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>
      <p className="missed-intro">Small choices. Real potential.</p>
      {error && (
        <div className="missed-error" role="alert">
          <p>{error}</p>
          <button onClick={retry}>Try again</button>
        </div>
      )}
      {!summary && loading && (
        <p className="missed-loading" role="status">
          Loading your simulated purchases…
        </p>
      )}
      {summary && (
        <>
          {/* Desktop: summary column (sticky) beside the chart and history. */}
          <div className="missed-body">
          <div className="missed-summary">
          <div className="missed-hero">
            <p>You could have earned</p>
            <div className="missed-total">
              <CountUp cents={summary.total_missed_cents} />
            </div>
            <p>more in rewards over the {summary.window_label.toLowerCase()}</p>
            <div className="missed-hero-footnote">From {summary.transaction_count} simulated purchases</div>
          </div>
          <div className="missed-stats">
            <div>
              <span>Value earned</span>
              <strong>{formatCents(summary.total_earned_cents)}</strong>
            </div>
            <div>
              <span>Best possible</span>
              <strong>{formatCents(summary.total_best_possible_cents)}</strong>
            </div>
          </div>
          </div>
          <div className="missed-details">
          {summary.transaction_count === 0 ? (
            <div className="missed-empty">
              <h2>A fresh start</h2>
              <p>Make a simulated purchase in Wallet or Scan to see how your card choice adds up.</p>
            </div>
          ) : (
            <>
              <DailyChart daily={summary.daily} />
              {summary.by_category.length > 0 && (
                <section className="missed-categories" aria-labelledby="missed-category-heading">
                  <h2 id="missed-category-heading">Where it adds up</h2>
                  <ul>
                    {summary.by_category.map((category) => (
                      <li key={category.category}>
                        <span>{category.category_label}</span>
                        <strong>{formatCents(category.missed_cents)}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="missed-history" aria-labelledby="missed-history-heading">
                <div className="missed-section-heading">
                  <h2 id="missed-history-heading">Recent purchases</h2>
                  <span>{summary.recent.length} shown</span>
                </div>
                <ul>
                  {summary.recent.map((t) => (
                    <li className="missed-transaction" key={t.id}>
                      <div className="missed-transaction-top">
                        <h3>{t.merchant_name}</h3>
                        <strong className={t.missed_cents > 0 ? 'missed-loss' : 'missed-optimal'}>
                          {t.missed_cents > 0 ? `${formatCents(t.missed_cents)} missed` : 'Maximized'}
                        </strong>
                      </div>
                      <div className="missed-transaction-meta">
                        <time dateTime={t.ts}>
                          {new Date(t.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                        </time>
                        <span>
                          · {formatCents(t.amount_cents)}
                          {t.coupon_code ? ` after ${t.coupon_code}` : ''} · {t.channel === 'online' ? 'Online' : 'In store'}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt>Used</dt>
                          <dd>{cardName(t.card_used_id)}</dd>
                        </div>
                        <div>
                          <dt>Best choice</dt>
                          <dd>{cardName(t.best_card_id)}</dd>
                        </div>
                      </dl>
                      <p className="missed-reward-comparison">
                        Earned {formatCents(t.earned_cents)} of {formatCents(t.best_possible_cents)} possible
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
          </div>
          </div>
          <p className="missed-disclaimer">
            Simulated purchases and estimated rewards. Daily totals use UTC; the window covers the past{' '}
            {summary.window_days} × 24 hours.
            {import.meta.env.DEV ? ` Database: ${summary.db_mode}.` : ''}
          </p>
        </>
      )}
    </section>
  )
}
