// Scan: read a cart screenshot, a typed store, or a deal handed over from Deals;
// show the coupon + card + total stack; log which card was actually used.
// Owner: Nazeef.

import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { api } from '../../api'
import { useNav } from '../../navigation'
import type { Card, CartParseResponse, StackRequest, StackResponse } from '../../types'
import { DemoBadge, ErrorNotice, Loading, ScreenHeader } from '../../components/ui'
import { CartInput } from './CartInput'
import { CardUsedPicker } from './CardUsedPicker'
import { Reveal, StackResult } from './StackResult'

type ScanRequest = { kind: 'upload'; file: File } | { kind: 'sample' } | { kind: 'stack'; body: StackRequest }

interface Result {
  id: number
  stack: StackResponse
  parse: CartParseResponse | null
}

const LOADING_LABEL: Record<ScanRequest['kind'], string> = {
  upload: 'Reading your cart with Gemini…',
  sample: 'Loading the sample cart…',
  stack: 'Finding the best coupon and card…',
}

// Deals always sends a subtotal; this only covers an openScan() without one.
const DEFAULT_SUBTOTAL_CENTS = 10000

export function ScanScreen() {
  const { scanIntent, clearScanIntent } = useNav()
  const [pending, setPending] = useState<ScanRequest | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [failure, setFailure] = useState<{ error: unknown; request: ScanRequest } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const inflight = useRef<AbortController | null>(null)

  const run = useCallback(async (request: ScanRequest) => {
    inflight.current?.abort()
    const ctrl = new AbortController()
    inflight.current = ctrl
    setPending(request)
    setFailure(null)
    setResult(null)
    try {
      if (request.kind === 'stack') {
        const stack = await api.stack(request.body, ctrl.signal)
        setResult({ id: Date.now(), stack, parse: null })
      } else {
        const parse = await api.parseCart(request.kind === 'upload' ? { file: request.file } : { useSample: true }, ctrl.signal)
        setResult({ id: Date.now(), stack: parse.stack, parse })
      }
    } catch (error) {
      if (!ctrl.signal.aborted) setFailure({ error, request })
    } finally {
      if (inflight.current === ctrl) setPending(null)
    }
  }, [])

  useEffect(() => () => inflight.current?.abort(), [])

  // Card colours for the swatches only; every number comes from the stack itself.
  useEffect(() => {
    const ctrl = new AbortController()
    api.wallet(ctrl.signal).then((w) => setCards(w.cards), () => {})
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    if (!scanIntent) return
    const { merchantId, merchantName, subtotalCents } = scanIntent
    clearScanIntent()
    void run({
      kind: 'stack',
      body: { merchant_id: merchantId, merchant_name: merchantName, subtotal_cents: subtotalCents ?? DEFAULT_SUBTOTAL_CENTS },
    })
  }, [scanIntent, clearScanIntent, run])

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function upload(file: File) {
    setPreview(URL.createObjectURL(file))
    void run({ kind: 'upload', file })
  }

  function startOver() {
    inflight.current?.abort()
    setPending(null)
    setResult(null)
    setFailure(null)
    setPreview(null)
  }

  const showInput = !pending && !result

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Scan">
        <ScreenHeader title="Scan" subtitle={<DemoBadge>Coupons are simulated · not verified offers</DemoBadge>} />

        {pending && (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/[0.04] p-6">
            {pending.kind === 'upload' && preview && (
              <img src={preview} alt="Your cart screenshot" className="max-h-56 rounded-xl object-contain opacity-80" />
            )}
            <Loading label={LOADING_LABEL[pending.kind]} />
            <button type="button" onClick={startOver} className="text-sm text-white/55 hover:text-white/80">
              Cancel
            </button>
          </div>
        )}

        {failure && (
          <div className="mb-4">
            <ErrorNotice error={failure.error} onRetry={() => void run(failure.request)} />
          </div>
        )}

        {showInput && (
          <CartInput onUpload={upload} onSample={() => void run({ kind: 'sample' })} onManual={(body) => void run({ kind: 'stack', body })} />
        )}

        {result && (
          // Desktop: the stack on the left, "which card did you use?" beside it.
          <div className="space-y-3 lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-8 lg:space-y-0">
            <StackResult stack={result.stack} parse={result.parse} cards={cards} />
            <div className="space-y-3 lg:sticky lg:top-6">
            <Reveal order={3}>
              <CardUsedPicker key={result.id} stack={result.stack} cards={cards} />
            </Reveal>
            <button
              type="button"
              onClick={startOver}
              className="w-full rounded-2xl bg-white/10 py-3 text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-white/15 active:scale-[0.97]"
            >
              Scan another cart
            </button>
            </div>
          </div>
        )}
      </section>
    </MotionConfig>
  )
}
