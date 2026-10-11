// The three ways into a stack: upload a cart screenshot, use the sample cart,
// or type a store and subtotal.

import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { StackRequest } from '../../types'
import { parseDollarsToCents } from '../../lib/format'

interface Props {
  onUpload: (file: File) => void
  onSample: () => void
  onManual: (body: StackRequest) => void
}

export function CartInput({ onUpload, onSample, onManual }: Props) {
  const [store, setStore] = useState('')
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // so picking the same file again still fires
    if (file) onUpload(file)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseDollarsToCents(amount)
    if (!store.trim()) return setFormError('Enter a store name.')
    if (cents === null) return setFormError('Enter a subtotal, like 42.50.')
    setFormError(null)
    onManual({ merchant_name: store.trim(), subtotal_cents: cents })
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-3">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border border-dashed border-white/20 bg-white/[0.03] px-6 py-10 text-center transition-colors focus-within:outline-2 focus-within:outline-sky-400 hover:border-white/35 hover:bg-white/[0.06]">
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} />
          <svg viewBox="0 0 24 24" className="h-9 w-9 text-white/70" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M12 8v8M8 12l4-4 4 4" />
          </svg>
          <span className="text-base font-semibold">Upload a cart screenshot</span>
          <span className="text-sm text-white/50">Gemini reads the store and items · PNG, JPEG, or WEBP up to 5 MB</span>
        </label>
        <button
          type="button"
          onClick={onSample}
          className="w-full rounded-2xl bg-white/10 py-3 text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-white/15 active:scale-[0.97]"
        >
          Try the sample cart
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-white/40" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        or type it in
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={submit} noValidate className="space-y-3">
        <div>
          <label htmlFor="scan-store" className="mb-1.5 block text-xs font-medium text-white/60">
            Store
          </label>
          <input
            id="scan-store"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Nike, Joe's Pizza…"
            className="w-full rounded-xl bg-white/10 px-3 py-3 text-base placeholder:text-white/30 focus:outline-2 focus:outline-sky-400"
          />
        </div>
        <div>
          <label htmlFor="scan-amount" className="mb-1.5 block text-xs font-medium text-white/60">
            Subtotal
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
            <input
              id="scan-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="go"
              placeholder="0.00"
              className="w-full rounded-xl bg-white/10 py-3 pl-7 pr-3 text-base tabular-nums placeholder:text-white/30 focus:outline-2 focus:outline-sky-400"
            />
          </div>
        </div>
        {formError && (
          <p role="alert" className="text-sm text-red-300">
            {formError}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-2xl bg-white py-3 font-semibold text-black transition-transform duration-150 active:scale-[0.97]"
        >
          Find the best stack
        </button>
      </form>
    </div>
  )
}
