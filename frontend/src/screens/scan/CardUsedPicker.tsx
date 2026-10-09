// "Which card did you pay with?" Logs the purchase so Missed can count what the
// card choice cost. The server computes every reward figure; we send inputs only.

import { useState, type FormEvent } from 'react'
import { api, newIdempotencyKey } from '../../api'
import { useNav } from '../../navigation'
import type { Card, StackResponse, Transaction } from '../../types'
import { formatCents } from '../../lib/format'
import { ErrorNotice } from '../../components/ui'
import { CardSwatch } from './CardSwatch'

export function CardUsedPicker({ stack, cards }: { stack: StackResponse; cards: Card[] }) {
  const { notifyTransactionLogged, setTab } = useNav()
  // One key per purchase: retries after a failure must not log it twice.
  const [idempotencyKey] = useState(newIdempotencyKey)
  const [cardId, setCardId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [logged, setLogged] = useState<Transaction | null>(null)

  async function log(e?: FormEvent) {
    e?.preventDefault()
    if (!cardId) return
    setSaving(true)
    setError(null)
    try {
      const { transaction } = await api.createTransaction({
        idempotency_key: idempotencyKey,
        ...(stack.merchant_known ? { merchant_id: stack.merchant.id } : { merchant_name: stack.merchant.name }),
        subtotal_cents: stack.subtotal_cents,
        shipping_cents: stack.shipping_cents,
        coupon_code: stack.coupon?.coupon.code ?? null,
        card_used_id: cardId,
        channel: 'online',
        source: 'scan',
      })
      setLogged(transaction)
      notifyTransactionLogged()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  if (logged) {
    const best = stack.ranking.find((r) => r.card_id === logged.best_card_id)
    return (
      <div role="status" className="rounded-2xl bg-white/[0.06] p-4">
        {logged.missed_cents > 0 ? (
          <p className="text-sm">
            Logged. Paying with that card missed{' '}
            <span className="font-semibold tabular-nums text-red-300">{formatCents(logged.missed_cents)}</span>
            {best && ` compared with ${best.card_name}`}.
          </p>
        ) : (
          <p className="text-sm">
            Logged. Best card for this order: you earned{' '}
            <span className="font-semibold tabular-nums text-emerald-300">{formatCents(logged.earned_cents)}</span>.
          </p>
        )}
        <button type="button" onClick={() => setTab('missed')} className="mt-3 text-sm font-medium text-sky-300 hover:text-sky-200">
          See missed rewards →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={log} className="rounded-2xl bg-white/[0.06] p-4">
      <fieldset disabled={saving}>
        <legend className="mb-3 text-sm font-semibold">Which card did you pay with?</legend>
        <div className="space-y-2">
          {stack.ranking.map((r) => (
            <label
              key={r.card_id}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-400 ${
                !r.accepted
                  ? 'cursor-not-allowed opacity-40 ring-white/5'
                  : cardId === r.card_id
                    ? 'cursor-pointer bg-white/10 ring-white/40'
                    : 'cursor-pointer ring-white/10 hover:bg-white/[0.04]'
              }`}
            >
              <input
                type="radio"
                name="card-used"
                value={r.card_id}
                checked={cardId === r.card_id}
                disabled={!r.accepted}
                onChange={() => setCardId(r.card_id)}
                className="sr-only"
              />
              <CardSwatch card={cards.find((c) => c.id === r.card_id)} />
              <span className="min-w-0 flex-1 text-sm">
                {r.card_name}
                {r.is_winner && <span className="ml-2 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">BEST</span>}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-white/55">{r.accepted ? `earns ${formatCents(r.value_cents)}` : 'Not accepted'}</span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={!cardId || saving}
          className="mt-4 w-full rounded-2xl bg-white py-3 font-semibold text-black transition-[opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
        >
          {saving ? 'Logging…' : 'Log purchase'}
        </button>
      </fieldset>
      {error ? (
        <div className="mt-3">
          <ErrorNotice error={error} onRetry={() => void log()} />
        </div>
      ) : null}
      <p className="mt-3 text-xs text-white/40">Simulated purchase for the demo. Nothing is charged.</p>
    </form>
  )
}
