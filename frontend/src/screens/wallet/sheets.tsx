import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircleIcon, CheckIcon, InfoIcon, XCircleIcon } from '@phosphor-icons/react'
import { api } from '../../api'
import type { StoreDetection } from '../../location'
import type { Card, CardBenefitsResponse, CardType, Location, RecommendResponse } from '../../types'
import { Sheet } from '../../components/Sheet'
import { SmoothInput } from '../../components/skiper'
import { CardFace, ErrorNotice, Loading, MerchantMark, Row } from '../../components/ui'
import { runnerUpLine, whyChecks } from '../../lib/derive'
import { money } from '../../lib/format'
import { CARD_TEMPLATES, categoryLabel } from '../../lib/merchants'

const panel = 'n-sheet rounded-t-[28px] text-white'
const handle = 'bg-white/30'
const muted = 'text-[rgba(235,235,245,0.6)]'
const heading = `px-1 pb-2 pt-6 text-[13px] uppercase tracking-[0.6px] ${muted}`

/** What the location check found, in a few words, under the store list's title. */
function whereLine(detection: StoreDetection) {
  switch (detection.status) {
    case 'detected':
      return detection.location ? `You're at ${detection.location.merchant.name}` : 'Pick the store you’re in'
    case 'locating':
    case 'matching':
      return 'Finding your location…'
    case 'denied':
      return 'Location is off. Pick the store you’re in.'
    default:
      return 'Pick the store you’re in'
  }
}

export function StoreSheet({
  open,
  onOpenChange,
  locations,
  detection,
  storeId,
  onPick,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  locations: Location[]
  detection: StoreDetection
  storeId: string | null
  onPick: (id: string | null) => void
}) {
  const sorted = [...locations].sort((a, b) => a.distance_m - b.distance_m)
  const busy = detection.status === 'locating' || detection.status === 'matching'
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Where are you?" panelClassName={panel} handleClassName={handle} hideTitle>
      <div className="pb-1 pt-2 text-center text-[17px] font-semibold">Where are you?</div>
      <p className={`pb-4 text-center text-[13px] ${muted}`}>
        {whereLine(detection)}
        {!busy && detection.status !== 'detected' && detection.status !== 'insecure' ? (
          <>
            {' · '}
            <button type="button" onClick={detection.recheck} className="text-[#0A84FF]">
              Use my location
            </button>
          </>
        ) : null}
      </p>
      <div className="overflow-hidden n-well rounded-[16px]">
        {sorted.map((l, i) => (
          <Row
            key={l.id}
            leading={<MerchantMark id={l.merchant.id} name={l.merchant.name} size={32} />}
            title={l.merchant.name}
            subtitle={`${categoryLabel[l.merchant.category] ?? l.merchant.category_label} · ${l.distance_m} m`}
            trailing={l.id === storeId ? <CheckIcon size={20} weight="bold" className="text-[#0A84FF]" /> : undefined}
            onClick={() => onPick(l.id)}
            last={i === sorted.length - 1}
          />
        ))}
      </div>
      {storeId ? (
        <button type="button" onClick={() => onPick(null)} className="mt-3 h-12 w-full n-well rounded-[16px] text-[17px] text-[#0A84FF] active:bg-white/10">
          I'm not at a store
        </button>
      ) : null}
    </Sheet>
  )
}

export function WhySheet({ open, onOpenChange, rec, cardsById }: { open: boolean; onOpenChange: (o: boolean) => void; rec: RecommendResponse | null; cardsById: Record<string, Card> }) {
  if (!rec) return null
  const winner = rec.ranking.find((r) => r.is_winner)
  const accepted = rec.ranking.filter((r) => r.accepted)
  const max = Math.max(1, ...accepted.map((r) => r.value_cents))
  const runner = runnerUpLine(rec)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Why ${winner?.card_name}`} panelClassName={panel} handleClassName={handle} hideTitle>
      <div className="pb-4 pt-2 text-center">
        <div className={`text-[13px] ${muted}`}>
          {rec.merchant.name} · {money(rec.amount_cents)}
        </div>
        <div className="text-[22px] font-bold">Why {winner?.card_name} wins</div>
      </div>
      <ul className="overflow-hidden n-well rounded-[16px]">
        {whyChecks(rec).map((c, i, all) => (
          <li key={c.label} className="flex gap-3 pl-4">
            <span className="pt-[11px]">
              {c.ok === true ? (
                <CheckCircleIcon size={22} weight="fill" className="text-[#30D158]" />
              ) : c.ok === false ? (
                <XCircleIcon size={22} weight="fill" className="text-[#FF453A]" />
              ) : (
                <InfoIcon size={22} weight="fill" className="text-[#0A84FF]" />
              )}
            </span>
            <div className={`flex-1 py-[11px] pr-4 ${i === all.length - 1 ? '' : 'shadow-[inset_0_-0.5px_0_rgba(84,84,88,0.6)]'}`}>
              <div className="text-[17px] leading-[22px]">{c.label}</div>
              {c.detail ? <div className={`text-[15px] leading-[20px] ${muted}`}>{c.detail}</div> : null}
            </div>
          </li>
        ))}
      </ul>
      <h3 className={heading}>Every card, here</h3>
      <ul className="space-y-3 n-well rounded-[16px] p-4">
        {rec.ranking.map((r) => {
          const card = cardsById[r.card_id]
          return (
            <li key={r.card_id} className={r.accepted ? '' : 'opacity-50'}>
              <div className="flex items-baseline justify-between text-[15px]">
                <span className="flex items-center gap-2">
                  {card ? (
                    <span className="h-4 w-6 overflow-hidden rounded-[3px]">
                      <CardFace card={card} compact />
                    </span>
                  ) : null}
                  {r.card_name}
                </span>
                <span className="font-[family-name:var(--font-sf-rounded)] tabular-nums">{r.accepted ? money(r.value_cents) : 'Not accepted'}</span>
              </div>
              {r.accepted ? (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full origin-left rounded-full"
                    style={{ background: r.is_winner ? '#30D158' : 'rgba(255,255,255,0.4)' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: r.value_cents / max }}
                    transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      {runner ? <p className={`px-1 pt-3 text-[13px] ${muted}`}>{runner}. Points valued at the card's typical redemption rate.</p> : null}
    </Sheet>
  )
}

export function AddCardSheet({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Resolves once the card is in the wallet; a rejection is shown in the sheet. */
  onAdd: (type: CardType, last4: string) => Promise<unknown>
}) {
  const [type, setType] = useState<CardType | null>(null)
  const [last4, setLast4] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const valid = type && /^\d{4}$/.test(last4)
  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) {
      setType(null)
      setLast4('')
      setError(null)
    }
  }
  const add = async () => {
    if (!type || busy) return
    setBusy(true)
    setError(null)
    try {
      await onAdd(type, last4)
      close(false)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={open} onOpenChange={close} title="Add a card" panelClassName={panel} handleClassName={handle} hideTitle>
      <div className="pb-4 pt-2 text-center text-[17px] font-semibold">Add a card</div>
      <div className="overflow-hidden n-well rounded-[16px]">
        {CARD_TEMPLATES.map((c, i) => (
          <Row
            key={c.type}
            leading={
              <span className="block h-[30px] w-[46px]">
                <CardFace card={c} compact />
              </span>
            }
            title={c.name}
            subtitle={c.issuer}
            trailing={type === c.type ? <CheckIcon size={20} weight="bold" className="text-[#0A84FF]" /> : undefined}
            onClick={() => setType(c.type)}
            last={i === CARD_TEMPLATES.length - 1}
          />
        ))}
      </div>
      <label htmlFor="add-card-last4" className={`block ${heading.replace('pt-6', 'pt-5')}`}>
        Last four digits
      </label>
      <SmoothInput
        id="add-card-last4"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={last4}
        onChange={(v) => setLast4(v.replace(/\D/g, ''))}
        placeholder="0042"
        className="h-12 w-full n-well rounded-[16px] px-4 text-[17px] tracking-[3px] text-white placeholder:text-white/25 focus:outline-2 focus:outline-white/70"
      />
      {error ? (
        <div className="pt-4">
          <ErrorNotice error={error} />
        </div>
      ) : null}
      <button
        type="button"
        disabled={!valid || busy}
        onClick={() => void add()}
        className="mt-5 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black transition-[opacity,transform] duration-150 active:scale-[0.98] disabled:bg-white/15 disabled:text-white/40"
      >
        {busy ? 'Adding…' : 'Add card'}
      </button>
    </Sheet>
  )
}

/** Everything a card earns, from GET /api/wallet/{id}/benefits: its rates, and the stores where it's your best card. */
export function CardDetailsSheet({ open, onOpenChange, card }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null }) {
  const [benefits, setBenefits] = useState<CardBenefitsResponse | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const cardId = card?.id

  useEffect(() => {
    if (!open || !cardId) return
    const ctrl = new AbortController()
    setError(null)
    api.cardBenefits(cardId, ctrl.signal).then(
      (b) => setBenefits(b),
      (e) => !ctrl.signal.aborted && setError(e),
    )
    return () => ctrl.abort()
  }, [open, cardId, attempt])

  if (!card) return null
  const b = benefits?.card.id === card.id ? benefits : null
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${card.name} details`} panelClassName={panel} handleClassName={handle} hideTitle>
      <div className="mx-auto mb-5 mt-2 aspect-[340/214] w-[220px]">
        <CardFace card={card} radius={11} live />
      </div>
      <div className="overflow-hidden n-well rounded-[16px]">
        <Row title="Card number" trailing={<span className={`font-mono ${muted}`}>•••• {card.last4}</span>} />
        <Row title="Issuer" trailing={<span className={muted}>{card.issuer}</span>} />
        <Row title="Network" trailing={<span className={`capitalize ${muted}`}>{card.network}</span>} />
        <Row title="Rewards" trailing={<span className={muted}>{b?.valuation_label ?? (card.reward_type === 'points' ? 'Points' : 'Cash back')}</span>} last />
      </div>

      {error ? (
        <div className="pt-6">
          <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      ) : !b ? (
        <Loading label="Loading what it earns…" />
      ) : (
        <>
          <h3 className={heading}>Earns</h3>
          <div className="overflow-hidden n-well rounded-[16px]">
            {b.benefits.map((r, i) => (
              <Row
                key={`${r.kind}-${r.key}`}
                title={r.label}
                subtitle={r.applies_to.length ? r.applies_to.join(', ') : undefined}
                trailing={
                  <div className="tabular-nums">
                    <div className="text-[17px]">{r.rate_label}</div>
                    <div className={`text-[13px] ${muted}`}>{r.yield_pct}% back</div>
                  </div>
                }
                last={i === b.benefits.length - 1}
              />
            ))}
          </div>

          {b.best_at.length ? (
            <>
              <h3 className={heading}>Your best card at</h3>
              <div className="overflow-hidden n-well rounded-[16px]">
                {b.best_at.map((s, i) => (
                  <Row
                    key={s.merchant_id}
                    leading={<MerchantMark id={s.merchant_id} name={s.merchant_name} size={32} />}
                    title={s.merchant_name}
                    trailing={s.yield_pct !== null ? <span className="tabular-nums text-[#30D158]">{s.yield_pct}% back</span> : undefined}
                    last={i === b.best_at.length - 1}
                  />
                ))}
              </div>
            </>
          ) : null}

          {b.not_accepted_at.length ? (
            <>
              <h3 className={heading}>Not accepted at</h3>
              <div className="overflow-hidden n-well rounded-[16px]">
                {b.not_accepted_at.map((s, i) => (
                  <Row
                    key={s.merchant_id}
                    leading={<MerchantMark id={s.merchant_id} name={s.merchant_name} size={32} />}
                    title={s.merchant_name}
                    last={i === b.not_accepted_at.length - 1}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </Sheet>
  )
}

export function ConfirmRemoveSheet({
  open,
  onOpenChange,
  card,
  onRemove,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  card: Card | null
  onRemove: () => Promise<unknown>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  if (!card) return null
  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      await onRemove()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setError(null)
      }}
      title={`Remove ${card.name}?`}
      panelClassName={panel}
      handleClassName={handle}
      hideTitle
    >
      <div className="pb-2 pt-3 text-center">
        <div className="text-[17px] font-semibold">Remove {card.name}?</div>
        <p className={`mx-auto max-w-[30ch] pt-1 text-[15px] ${muted}`}>It stops being considered for recommendations. Past purchases stay in Rewards.</p>
      </div>
      {error ? (
        <div className="pt-3">
          <ErrorNotice error={error} />
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void remove()}
        className="mt-4 h-[50px] w-full n-well rounded-[16px] text-[17px] font-semibold text-[#FF453A] active:bg-white/10 disabled:opacity-50"
      >
        {busy ? 'Removing…' : 'Remove card'}
      </button>
      <button type="button" onClick={() => onOpenChange(false)} className="mt-2 h-[50px] w-full rounded-[12px] text-[17px] text-[#0A84FF]">
        Cancel
      </button>
    </Sheet>
  )
}
