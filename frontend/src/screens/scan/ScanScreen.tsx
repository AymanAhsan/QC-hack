// Scan screen slot. Owner: Nazeef — replace this stub with the full Scan experience.
// It demonstrates the contract: consume nav.scanIntent (from Deals) and POST /api/stack.

import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../api'
import { useNav } from '../../navigation'
import type { StackResponse } from '../../types'
import { formatCents, formatPct, parseDollarsToCents } from '../../lib/format'
import { DemoBadge, ErrorNotice, ScreenHeader } from '../../components/ui'

export function ScanScreen() {
  const { scanIntent, clearScanIntent } = useNav()
  const [store, setStore] = useState('')
  const [amount, setAmount] = useState('')
  const [stack, setStack] = useState<StackResponse | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function run(req: { merchant_id?: string; merchant_name?: string; subtotal_cents: number }) {
    setError(null)
    try {
      setStack(await api.stack(req))
    } catch (e) {
      setError(e)
    }
  }

  useEffect(() => {
    if (!scanIntent) return
    const subtotal = scanIntent.subtotalCents ?? 10000
    setStore(scanIntent.merchantName ?? scanIntent.merchantId ?? '')
    setAmount((subtotal / 100).toFixed(2))
    void run({ merchant_id: scanIntent.merchantId, merchant_name: scanIntent.merchantName, subtotal_cents: subtotal })
    clearScanIntent()
  }, [scanIntent, clearScanIntent])

  function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseDollarsToCents(amount)
    if (!store.trim() || cents === null) return setError(new Error('Enter a store and an amount'))
    void run({ merchant_name: store.trim(), subtotal_cents: cents })
  }

  return (
    <section>
      <ScreenHeader title="Scan" subtitle={<DemoBadge>Coupons are simulated</DemoBadge>} />
      <form onSubmit={submit} className="space-y-2">
        <input aria-label="Store" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store (e.g. Nike)" className="w-full rounded-xl bg-white/10 px-3 py-2" />
        <input aria-label="Subtotal in dollars" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Subtotal ($)" className="w-full rounded-xl bg-white/10 px-3 py-2" />
        <button type="submit" className="w-full rounded-xl bg-white py-2 font-semibold text-black">Stack it</button>
      </form>
      {error ? <div className="mt-3"><ErrorNotice error={error} /></div> : null}
      {stack && (
        <dl className="mt-4 space-y-1 rounded-2xl bg-white/5 p-4 text-sm">
          <div className="flex justify-between"><dt>Store</dt><dd>{stack.merchant.name}</dd></div>
          <div className="flex justify-between"><dt>Coupon</dt><dd>{stack.coupon ? `${stack.coupon.coupon.code} −${formatCents(stack.coupon.savings_cents)}` : 'None'}</dd></div>
          <div className="flex justify-between"><dt>Card</dt><dd>{stack.ranking.find((r) => r.is_winner)?.card_name ?? 'No accepted card'}</dd></div>
          <div className="flex justify-between"><dt>Rewards</dt><dd>{formatCents(stack.rewards_value_cents)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Total value</dt><dd>{formatCents(stack.total_value_cents)} ({formatPct(stack.total_value_pct)})</dd></div>
        </dl>
      )}
    </section>
  )
}
