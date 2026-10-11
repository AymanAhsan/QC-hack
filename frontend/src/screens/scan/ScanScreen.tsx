// Scan: read a cart screenshot, a typed store, or a deal handed over from Deals;
// show the coupon + card stack; log which card was actually used.
// Owner: Nazeef.
//
// POST /api/cart/parse (upload or sample) or POST /api/stack (typed or from Deals),
// then POST /api/transactions through the session when the purchase is logged.

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon } from '@phosphor-icons/react'
import { api } from '../../api'
import { useNav } from '../../navigation'
import type { Session } from '../../session'
import type { Card, CartParseResponse, StackRequest, StackResponse, Transaction } from '../../types'
import { Money } from '../../components/Money'
import { Sheet } from '../../components/Sheet'
import { CardFace, earnLabel, Emoji, ErrorNotice, LargeTitle, MerchantMark, Row, Section } from '../../components/ui'
import { coinBurst } from '../../lib/coins'
import { celebrate } from '../../lib/confetti'
import { rateShort } from '../../lib/derive'
import { money, parseDollarsToCents } from '../../lib/format'
import { playChime, playTick } from '../../lib/sound'

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6, transition: { duration: 0.15 } } }
const springIn = { type: 'spring', duration: 0.45, bounce: 0 } as const
const muted = 'text-[rgba(235,235,245,0.6)]'

type ScanRequest = { kind: 'upload'; file: File } | { kind: 'sample' } | { kind: 'stack'; body: StackRequest }

interface Result {
  id: number
  stack: StackResponse
  parse: CartParseResponse | null
  request: ScanRequest
}

// Deals always sends a subtotal; this only covers an openScan() without one.
const DEFAULT_SUBTOTAL_CENTS = 10000
// The steps stay up at least this long, so a quick answer doesn't flash past.
// A screenshot gets longer: each step should visibly happen while the cart is read.
const MIN_SCAN_MS = 900
const MIN_UPLOAD_MS = 4500

export function ScanScreen({ session, onSeeRewards }: { session: Session; onSeeRewards: () => void }) {
  const { scanIntent, clearScanIntent } = useNav()
  const [pending, setPending] = useState<ScanRequest | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [failure, setFailure] = useState<{ error: unknown; request: ScanRequest } | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [logged, setLogged] = useState<Transaction | null>(null)
  const inflight = useRef<AbortController | null>(null)

  const run = useCallback(async (request: ScanRequest) => {
    inflight.current?.abort()
    const ctrl = new AbortController()
    inflight.current = ctrl
    setPending(request)
    setFailure(null)
    setResult(null)
    setLogged(null)
    const shown = new Promise((r) => setTimeout(r, request.kind === 'upload' ? MIN_UPLOAD_MS : MIN_SCAN_MS))
    try {
      let next: Result
      if (request.kind === 'stack') {
        next = { id: Date.now(), stack: await api.stack(request.body, ctrl.signal), parse: null, request }
      } else {
        const parse = await api.parseCart(request.kind === 'upload' ? { file: request.file } : { useSample: true }, ctrl.signal)
        next = { id: Date.now(), stack: parse.stack, parse, request }
      }
      await shown
      if (!ctrl.signal.aborted) setResult(next)
    } catch (error) {
      if (!ctrl.signal.aborted) setFailure({ error, request })
    } finally {
      if (inflight.current === ctrl) setPending(null)
    }
  }, [])

  useEffect(() => () => inflight.current?.abort(), [])

  // A deal tapped on the Deals tab arrives here as a typed stack.
  useEffect(() => {
    if (!scanIntent) return
    const { merchantId, merchantName, subtotalCents } = scanIntent
    clearScanIntent()
    void run({ kind: 'stack', body: { merchant_id: merchantId, merchant_name: merchantName, subtotal_cents: subtotalCents ?? DEFAULT_SUBTOTAL_CENTS } })
  }, [scanIntent, clearScanIntent, run])

  useEffect(() => {
    if (!image) return
    return () => URL.revokeObjectURL(image)
  }, [image])

  const upload = (file: File) => {
    setImage(URL.createObjectURL(file))
    void run({ kind: 'upload', file })
  }

  const startOver = () => {
    inflight.current?.abort()
    setPending(null)
    setResult(null)
    setFailure(null)
    setImage(null)
    setLogged(null)
  }

  const view = pending ? 'scanning' : result ? 'result' : failure ? 'failure' : 'idle'

  return (
    <div className="pb-32">
      <LargeTitle
        right={
          view === 'result' || view === 'failure' ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={startOver}
              className="n-glass h-11 rounded-full px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-white/70"
            >
              New scan
            </motion.button>
          ) : undefined
        }
      >
        Scan
      </LargeTitle>
      <AnimatePresence mode="wait" initial={false}>
        {view === 'idle' ? (
          <motion.div key="idle" {...fade} transition={springIn}>
            <Idle onFile={upload} onSample={() => void run({ kind: 'sample' })} onManual={(body) => void run({ kind: 'stack', body })} />
          </motion.div>
        ) : view === 'scanning' && pending ? (
          <motion.div key="scanning" {...fade} transition={springIn}>
            <Scanning request={pending} image={pending.kind === 'upload' ? image : null} cardCount={session.cards.length} onCancel={startOver} />
          </motion.div>
        ) : view === 'failure' && failure ? (
          <motion.div key="failure" {...fade} transition={springIn} className="px-4 pt-2">
            <ErrorNotice error={failure.error} onRetry={() => void run(failure.request)} />
          </motion.div>
        ) : result ? (
          <motion.div key={`result-${result.id}`} {...fade} transition={springIn}>
            <ResultView result={result} session={session} logged={logged} onLogged={setLogged} onRestart={startOver} onSeeRewards={onSeeRewards} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function Idle({ onFile, onSample, onManual }: { onFile: (f: File) => void; onSample: () => void; onManual: (body: StackRequest) => void }) {
  return (
    <div className="space-y-6 px-4 pt-2 wide:grid wide:grid-cols-2 wide:items-start wide:gap-6 wide:space-y-0">
      <div>
        <div className="n-panel flex flex-col items-center rounded-[26px] px-6 pb-6 pt-9 text-center">
          {/* A slow bob says "drop something here"; MotionConfig stills it under reduced motion. */}
          <motion.span className="block" animate={{ y: [0, -6, 0], rotate: [-4, 3, -4] }} transition={{ duration: 4.2, ease: 'easeInOut', repeat: Infinity }}>
            <Emoji name="receipt" size={88} className="drop-shadow-[0_14px_22px_rgba(0,0,0,0.45)]" />
          </motion.span>
          <h2 className="pt-5 text-[22px] font-bold leading-[28px]">Scan a cart screenshot</h2>
          <p className={`max-w-[30ch] pt-2 text-[15px] leading-[20px] ${muted}`}>We read the store and total, then stack the best coupon with the best card you have.</p>
          <label className="mt-7 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-full bg-white text-[17px] font-semibold text-black transition-transform duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white/70 active:scale-[0.98]">
            Choose screenshot
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = '' // so picking the same file again still fires
                if (f) onFile(f)
              }}
            />
          </label>
          <button type="button" onClick={onSample} className="mt-3 h-11 px-4 text-[17px] text-[#0A84FF] active:opacity-60">
            Try a sample cart
          </button>
        </div>
        <p className={`px-4 pt-3 text-center text-[13px] ${muted}`}>PNG, JPEG, or WEBP up to 5 MB</p>
      </div>
      <ManualEntry onSubmit={onManual} />
    </div>
  )
}

/** No screenshot: type the store and the subtotal. */
function ManualEntry({ onSubmit }: { onSubmit: (body: StackRequest) => void }) {
  const [store, setStore] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const cents = parseDollarsToCents(amount)
    if (!store.trim()) return setError('Enter a store name.')
    if (cents === null) return setError('Enter a subtotal, like 42.50.')
    setError(null)
    onSubmit({ merchant_name: store.trim(), subtotal_cents: cents })
  }
  const field = 'h-11 min-w-0 flex-1 bg-transparent text-right text-[17px] text-white outline-none placeholder:text-white/30'
  return (
    <form onSubmit={submit} noValidate>
      <h2 className="px-1 pb-2 font-[family-name:var(--font-sf-rounded)] text-[21px] font-bold leading-[25px]">Or type it in</h2>
      <div className="n-panel overflow-hidden rounded-[20px]">
        <label className="flex items-center gap-3 pl-4 pr-4 shadow-[inset_0_-0.5px_0_rgba(84,84,88,0.6)]">
          <span className="text-[17px]">Store</span>
          <input value={store} onChange={(e) => setStore(e.target.value)} autoComplete="off" autoCapitalize="words" enterKeyHint="next" placeholder="Nike, Joe's Pizza…" className={field} />
        </label>
        <label className="flex items-center gap-3 px-4">
          <span className="text-[17px]">Subtotal</span>
          <span className="flex min-w-0 flex-1 items-center justify-end">
            <span aria-hidden className={amount ? 'text-white' : 'text-white/30'}>
              $
            </span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoComplete="off" enterKeyHint="go" placeholder="0.00" className={`${field} max-w-[9ch] flex-none tabular-nums`} />
          </span>
        </label>
      </div>
      {error ? (
        <p role="alert" className="px-4 pt-2 text-[13px] text-[#FF453A]">
          {error}
        </p>
      ) : null}
      <button type="submit" className="mt-4 h-[50px] w-full rounded-full bg-white/[0.12] text-[17px] font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-white/20">
        Find the best stack
      </button>
    </form>
  )
}

const STEP_AT = [0, 650, 1250]
const UPLOAD_STEP_AT = [0, 2000, 3400]

function Scanning({ request, image, cardCount, onCancel }: { request: ScanRequest; image: string | null; cardCount: number; onCancel: () => void }) {
  const [at, setAt] = useState(0)
  useEffect(() => {
    const stepAt = request.kind === 'upload' ? UPLOAD_STEP_AT : STEP_AT
    const timers = stepAt.slice(1).map((ms, i) => setTimeout(() => setAt(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [request.kind])
  const steps = [
    request.kind === 'upload' ? 'Reading your cart' : request.kind === 'sample' ? 'Loading the sample cart' : `Looking up ${request.body.merchant_name ?? 'the store'}`,
    'Checking coupons',
    `Ranking your ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}`,
  ]
  return (
    <div className="px-4 pt-2">
      <div className="n-panel relative mx-auto h-[300px] w-[200px] overflow-hidden rounded-[18px]">
        {image ? (
          <img src={image} alt="Your cart screenshot" className="h-full w-full object-cover opacity-80" />
        ) : (
          <div aria-hidden className="space-y-3 p-4">
            <div className="h-3 w-16 rounded bg-white/25" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2">
                <div className="size-10 shrink-0 rounded-md bg-white/10" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-2 w-full rounded bg-white/15" />
                  <div className="h-2 w-2/3 rounded bg-white/10" />
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-3">
              <div className="h-2.5 w-14 rounded bg-white/20" />
              <div className="h-2.5 w-10 rounded bg-white/25" />
            </div>
          </div>
        )}
        <motion.div aria-hidden className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-[#0A84FF]/25 to-transparent" initial={{ y: -64 }} animate={{ y: 300 }} transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }} />
        <motion.div aria-hidden className="absolute inset-x-0 h-[1.5px] bg-[#0A84FF]" initial={{ y: -32 }} animate={{ y: 332 }} transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }} />
      </div>
      <ul className="mx-auto mt-7 w-fit space-y-3" aria-live="polite">
        {steps.map((label, i) => (
          <li key={i} className={`flex items-center gap-3 text-[17px] transition-colors duration-200 ${i <= at ? 'text-white' : 'text-white/30'}`}>
            <span className="grid size-6 place-items-center">
              {i < at ? (
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.3, bounce: 0.4 }}>
                  <CheckIcon size={18} weight="bold" className="text-[#30D158]" />
                </motion.span>
              ) : i === at ? (
                <span className="size-4 rounded-full border-2 border-white/25 border-t-white motion-safe:animate-spin" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            <span className={i === at ? 'n-shimmer' : undefined}>{label}</span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onCancel} className="mx-auto mt-6 block h-11 px-4 text-[17px] text-[#0A84FF]">
        Cancel
      </button>
    </div>
  )
}

function sourceLine(result: Result) {
  // An upload always reads as yours, even when the image fell back to the sample cart.
  if (result.parse) return result.request.kind === 'sample' ? 'Sample cart' : 'From your screenshot'
  return result.stack.merchant_known ? result.stack.merchant.category_label : 'New store'
}

function ResultView({
  result,
  session,
  logged,
  onLogged,
  onRestart,
  onSeeRewards,
}: {
  result: Result
  session: Session
  logged: Transaction | null
  onLogged: (t: Transaction) => void
  onRestart: () => void
  onSeeRewards: () => void
}) {
  const { stack, parse } = result
  const cardsById = Object.fromEntries(session.cards.map((c) => [c.id, c]))
  const bestEval = stack.ranking.find((r) => r.card_id === stack.winner_card_id) ?? null
  const best = bestEval ? cardsById[bestEval.card_id] : undefined
  const [why, setWhy] = useState(false)
  const [itemsOpen, setItemsOpen] = useState(false)

  return (
    <div className="space-y-7 wide:grid wide:grid-cols-[1.15fr_1fr] wide:items-start wide:gap-x-6 wide:space-y-0">
      <div className="space-y-7">
        <div className="flex items-center gap-3 px-4">
          <MerchantMark id={stack.merchant.id} name={stack.merchant.name} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[20px] font-semibold leading-[25px]">{stack.merchant.name}</div>
            <div className={`text-[15px] ${muted}`}>{sourceLine(result)}</div>
          </div>
        </div>


        <div className="px-4 text-center">
          <div className={`text-[15px] ${muted}`}>You get back</div>
          <div className="font-[family-name:var(--font-sf-rounded)] text-[64px] font-bold leading-[70px] tracking-[-1px] text-[#30D158]">
            <Money cents={stack.total_value_cents} />
          </div>
          <div className={`text-[15px] ${muted}`}>
            {stack.total_value_pct.toFixed(1)}% of {money(stack.original_total_cents)}
          </div>
        </div>

        <Section>
          {stack.coupon ? (
            <Row
              leading={<Emoji name="ticket" size={36} />}
              title={<span className="font-mono font-semibold tracking-[0.5px]">{stack.coupon.coupon.code}</span>}
              subtitle={stack.coupon.coupon.description}
              trailing={<span className="text-[17px] tabular-nums text-[#30D158]">−{money(stack.coupon.savings_cents)}</span>}
            />
          ) : null}
          {bestEval ? (
            <Row
              leading={
                best ? (
                  <span className="block h-[26px] w-9">
                    <CardFace card={best} compact />
                  </span>
                ) : undefined
              }
              title={bestEval.card_name}
              subtitle={`${rateShort(bestEval)} on ${money(stack.charge_cents)}`}
              trailing={<span className="text-[17px] tabular-nums text-[#30D158]">{earnLabel(bestEval.value_cents)}</span>}
            />
          ) : (
            <Row title="No card here" subtitle={`None of your cards are accepted at ${stack.merchant.name}`} />
          )}
          <Row title={<span className="text-[#0A84FF]">Why this stack</span>} chevron onClick={() => setWhy(true)} last />
        </Section>

        {parse ? (
          <Section>
            <Row
              title={`${parse.cart.items.length} ${parse.cart.items.length === 1 ? 'item' : 'items'}`}
              trailing={<span className={`tabular-nums ${muted}`}>{money(parse.cart.subtotal_cents)}</span>}
              onClick={() => setItemsOpen((o) => !o)}
              chevron
              last={!itemsOpen}
            />
            <AnimatePresence initial={false}>
              {itemsOpen ? (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', duration: 0.35, bounce: 0 }} className="overflow-hidden">
                  {parse.cart.items.map((it, i) => (
                    <Row
                      key={i}
                      title={<span className="whitespace-normal text-[15px]">{it.name}</span>}
                      subtitle={it.qty > 1 ? `Qty ${it.qty}` : undefined}
                      trailing={<span className="text-[15px] tabular-nums">{money(it.price_cents)}</span>}
                      last={i === parse.cart.items.length - 1 && parse.cart.shipping_cents === null}
                    />
                  ))}
                  {parse.cart.shipping_cents !== null ? (
                    <Row title={<span className="text-[15px]">Shipping</span>} trailing={<span className="text-[15px] tabular-nums">{parse.cart.shipping_cents === 0 ? 'Free' : money(parse.cart.shipping_cents)}</span>} last />
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Section>
        ) : null}
      </div>

      <div className="wide:sticky wide:top-0">
        <AnimatePresence mode="wait" initial={false}>
          {logged ? (
            <motion.div key="logged" {...fade} transition={springIn}>
              <Logged tx={logged} bestName={stack.ranking.find((r) => r.card_id === logged.best_card_id)?.card_name ?? null} streak={session.stats.streak} onSeeRewards={onSeeRewards} onRestart={onRestart} />
            </motion.div>
          ) : (
            <motion.div key="log" {...fade} transition={springIn}>
              <LogPurchase
                stack={stack}
                cardsById={cardsById}
                onLog={async (cardId) => {
                  const tx = await session.logScan(stack, cardId)
                  if (!tx) return
                  playChime()
                  if (tx.missed_cents === 0) {
                    celebrate({ colors: ['#30D158', '#ffffff', cardsById[cardId]?.glow ?? '#ffffff'], origin: { x: 0.5, y: 0.75 } })
                    coinBurst({ x: 0.5, y: 0.75 })
                  }
                  onLogged(tx)
                }}
                onRestart={onRestart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <WhyStackSheet open={why} onOpenChange={setWhy} stack={stack} />
    </div>
  )
}

function LogPurchase({
  stack,
  cardsById,
  onLog,
  onRestart,
}: {
  stack: StackResponse
  cardsById: Record<string, Card>
  onLog: (cardId: string) => Promise<void>
  onRestart: () => void
}) {
  const ranking = stack.ranking.filter((r) => r.accepted && cardsById[r.card_id])
  const bestId = stack.winner_card_id ?? ranking[0]?.card_id ?? null
  const [choosing, setChoosing] = useState(false)
  const [picked, setPicked] = useState(bestId)
  const [saving, setSaving] = useState(false)
  if (!bestId || !picked) {
    return (
      <div className="px-4">
        <button type="button" onClick={onRestart} className="h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black active:scale-[0.98]">
          Scan another cart
        </button>
      </div>
    )
  }
  const log = async () => {
    setSaving(true)
    try {
      await onLog(picked)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="px-4">
      <div className="n-panel rounded-[26px] p-5">
        <p className="text-center text-[20px] font-semibold">Paid with {cardsById[bestId]?.name}?</p>
        <AnimatePresence initial={false}>
          {choosing ? (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
              className="-mx-2 overflow-hidden pt-3"
              role="radiogroup"
              aria-label="Card used"
            >
              {ranking.map((r) => (
                <li key={r.card_id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={picked === r.card_id}
                    onClick={() => {
                      playTick()
                      setPicked(r.card_id)
                    }}
                    className="flex h-12 w-full items-center gap-3 rounded-[12px] px-2 text-left active:bg-white/5"
                  >
                    <span className="block h-[22px] w-8">
                      <CardFace card={cardsById[r.card_id]} compact />
                    </span>
                    <span className="flex-1 text-[17px]">{r.card_name}</span>
                    <span className={`text-[15px] tabular-nums ${muted}`}>{earnLabel(r.value_cents)}</span>
                    <span className={`grid size-[22px] place-items-center rounded-full ${picked === r.card_id ? 'bg-[#0A84FF]' : 'shadow-[inset_0_0_0_1.5px_rgba(235,235,245,0.3)]'}`}>
                      {picked === r.card_id ? <CheckIcon size={13} weight="bold" /> : null}
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
        <button
          type="button"
          disabled={saving}
          onClick={() => void log()}
          className="mt-5 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? 'Saving…' : picked === bestId ? 'Log purchase' : `Log with ${cardsById[picked]?.name}`}
        </button>
        {!choosing ? (
          <button type="button" onClick={() => setChoosing(true)} className="mt-2 h-11 w-full text-[17px] text-[#0A84FF]">
            I used a different card
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Logged({ tx, bestName, streak, onSeeRewards, onRestart }: { tx: Transaction; bestName: string | null; streak: number; onSeeRewards: () => void; onRestart: () => void }) {
  const maxed = tx.missed_cents === 0
  return (
    <div className="px-4">
      <div className="n-panel flex flex-col items-center rounded-[26px] px-5 pb-5 pt-7 text-center">
        {maxed ? (
          <Emoji name="party-popper" size={72} pop />
        ) : (
          <motion.span className="grid size-14 place-items-center rounded-full bg-white/[0.12]" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.5, bounce: 0.45 }}>
            <CheckIcon size={30} weight="bold" className="text-white" />
          </motion.span>
        )}
        <p className="pt-4 text-[20px] font-semibold">{maxed ? (tx.earned_cents ? `+${money(tx.earned_cents)} back` : 'Logged') : `Logged · ${money(tx.missed_cents)} missed`}</p>
        <p className={`pt-1 text-[15px] ${muted}`}>
          {maxed ? 'Best card, best coupon. Nothing left on the table.' : `${bestName ?? 'Your best card'} would have earned ${money(tx.best_possible_cents)}.`}
        </p>
        {maxed && streak > 0 ? (
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#FF9F0A]/15 px-3 py-1.5 text-[15px] font-semibold text-[#FF9F0A]">
            <Emoji name="fire" size={20} /> {streak} best-card {streak === 1 ? 'pick' : 'picks'} in a row
          </span>
        ) : null}
        <button type="button" onClick={onSeeRewards} className="mt-6 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black active:scale-[0.98]">
          See Rewards
        </button>
        <button type="button" onClick={onRestart} className="mt-2 h-11 w-full text-[17px] text-[#0A84FF]">
          Scan another cart
        </button>
      </div>
    </div>
  )
}

function WhyStackSheet({ open, onOpenChange, stack }: { open: boolean; onOpenChange: (o: boolean) => void; stack: StackResponse }) {
  const ranking = stack.ranking.filter((r) => r.accepted)
  const max = Math.max(...ranking.map((r) => r.value_cents), 1)
  const heading = `px-1 pb-2 text-[13px] uppercase tracking-[0.6px] ${muted}`
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Why this stack" panelClassName="n-sheet rounded-t-[28px] text-white" handleClassName="bg-white/30" hideTitle>
      <div className="pb-4 pt-2 text-center text-[22px] font-bold">Why this stack</div>
      {stack.coupons_considered.length ? (
        <>
          <h3 className={heading}>Coupons checked</h3>
          <div className="overflow-hidden n-well rounded-[16px]">
            {stack.coupons_considered.map((c, i, all) => (
              <Row
                key={c.coupon.code}
                title={<span className="font-mono">{c.coupon.code}</span>}
                subtitle={c.eligible ? c.coupon.description : (c.reason ?? c.coupon.description)}
                trailing={<span className={`tabular-nums ${c.coupon.code === stack.coupon?.coupon.code ? 'text-[#30D158]' : muted}`}>{c.eligible ? `−${money(c.savings_cents)}` : 'N/A'}</span>}
                last={i === all.length - 1}
              />
            ))}
          </div>
        </>
      ) : (
        <p className={`px-1 text-[15px] ${muted}`}>No coupons found for {stack.merchant.name}.</p>
      )}
      <h3 className={`${heading} pt-6`}>Cards on {money(stack.charge_cents)}</h3>
      <ul className="space-y-3 n-well rounded-[16px] p-4">
        {ranking.map((r) => (
          <li key={r.card_id}>
            <div className="flex justify-between text-[15px]">
              <span>{r.card_name}</span>
              <span className="tabular-nums">{money(r.value_cents)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ background: r.is_winner ? '#30D158' : 'rgba(255,255,255,0.4)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.value_cents / max }}
                transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
