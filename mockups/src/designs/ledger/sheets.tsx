import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckIcon, InfoIcon, XIcon } from '@phosphor-icons/react'
import { cardById, cards as templates, categoryLabel, locations, type Card, type CardType, type RecommendResponse } from '../../data/data'
import { Sheet } from '../../shared/Sheet'
import { money, mult, pct } from '../../shared/format'
import { CardArt, MerchantMark, PrimaryButton, focusRing, hairline, muted, networkName, serif } from './ui'

export const panel = 'rounded-t-[20px] bg-[#FAF9F6] text-[#141414] font-[family-name:var(--font-geist)] shadow-[0_-0.5px_0_rgba(20,20,20,0.2)]'
export const handle = 'bg-[#141414]/25'

function SheetTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="pb-4 pt-2">
      {sub ? <p className={`pb-1 text-[13px] font-medium ${muted}`}>{sub}</p> : null}
      <p className={`${serif} text-[32px] leading-[36px] tracking-[-0.3px]`}>{children}</p>
    </div>
  )
}

function RowButton({ children, onClick, selected }: { children: React.ReactNode; onClick: () => void; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[56px] w-full items-center gap-3 py-2 text-left transition-colors duration-150 active:bg-[#141414]/[0.04] ${hairline} ${focusRing}`}
    >
      {children}
    </button>
  )
}

export function StoreSheet({ open, onOpenChange, storeId, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; storeId: string | null; onPick: (id: string | null) => void }) {
  const sorted = [...locations].sort((a, b) => a.distance_m - b.distance_m)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Where are you shopping?" hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetTitle sub="Demo stores near Union Square">Where are you?</SheetTitle>
      <div className="border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        {sorted.map((l) => (
          <RowButton key={l.id} onClick={() => onPick(l.id)} selected={l.id === storeId}>
            <MerchantMark id={l.merchant.id} name={l.merchant.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-medium">{l.merchant.name}</span>
              <span className={`block text-[14px] ${muted}`}>
                {categoryLabel[l.merchant.category] ?? l.merchant.category_label} · {l.distance_m} m away
              </span>
            </span>
            {l.id === storeId ? <CheckIcon size={20} weight="bold" className="text-[#0F7B4A]" /> : null}
          </RowButton>
        ))}
      </div>
      {storeId ? (
        <button type="button" onClick={() => onPick(null)} className={`mt-3 h-11 text-[15px] font-medium underline decoration-[rgba(20,20,20,0.35)] underline-offset-4 ${focusRing}`}>
          I'm not at a store
        </button>
      ) : null}
    </Sheet>
  )
}

/** Plain-language reason a network is refused, without the engine's wording. */
export const refusal = (cardId: string, storeName: string) => `${networkName(cardById[cardId]?.network ?? 'visa')} isn't accepted at ${storeName}`

export function WhySheet({ open, onOpenChange, rec }: { open: boolean; onOpenChange: (o: boolean) => void; rec: RecommendResponse | null }) {
  if (!rec?.why) return null
  const w = rec.why
  const winner = rec.ranking.find((r) => r.is_winner)
  const accepted = rec.ranking.filter((r) => r.accepted)
  const max = Math.max(1, ...accepted.map((r) => r.value_cents))
  const rows: { mark: 'ok' | 'no' | 'info'; label: string; detail?: string }[] = [
    { mark: 'ok', label: w.network.label },
    { mark: 'info', label: `Coded as ${w.mcc.category_label.toLowerCase()}`, detail: `MCC ${w.mcc.code} · ${w.mcc.label}` },
    { mark: 'ok', label: w.rate.label, detail: w.valuation.summary },
    ...w.network.rejections.map((r) => ({ mark: 'no' as const, label: refusal(r.card_id, rec.merchant.name) })),
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Why ${winner?.card_name}`} hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetTitle sub={`${rec.merchant.name} · ${money(rec.amount_cents)}`}>
        Why <em className="italic">{winner?.card_name}</em>
      </SheetTitle>
      <ul className="border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        {rows.map((r) => (
          <li key={r.label} className={`flex gap-3 py-3 ${hairline}`}>
            <span className="pt-0.5">
              {r.mark === 'ok' ? (
                <CheckIcon size={18} weight="bold" className="text-[#0F7B4A]" />
              ) : r.mark === 'no' ? (
                <XIcon size={18} weight="bold" className="text-[#141414]" />
              ) : (
                <InfoIcon size={18} weight="regular" className="text-[#141414]" />
              )}
            </span>
            <span>
              <span className={`block text-[16px] ${r.mark === 'no' ? 'line-through decoration-[#141414]/40' : ''}`}>{r.label}</span>
              {r.detail ? <span className={`block text-[14px] ${muted}`}>{r.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="pb-3 pt-7 text-[13px] font-semibold uppercase tracking-[1.2px]">Every card here</p>
      <ul className="space-y-3.5">
        {rec.ranking.map((r) => (
          <li key={r.card_id}>
            <div className="flex items-baseline justify-between text-[15px]">
              <span className={r.accepted ? '' : muted}>{r.card_name}</span>
              <span className={`tabular-nums ${r.accepted ? (r.is_winner ? 'font-semibold text-[#0F7B4A]' : '') : muted}`}>
                {r.accepted ? money(r.value_cents) : 'Not accepted'}
              </span>
            </div>
            <div className="mt-1.5 h-[2px] bg-[#141414]/10">
              {r.accepted ? (
                <motion.div
                  className="h-full origin-left"
                  style={{ background: r.is_winner ? '#0F7B4A' : '#141414' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: r.value_cents / max }}
                  transition={{ type: 'spring', duration: 0.7, bounce: 0 }}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className={`pt-4 text-[14px] ${muted}`}>Points are valued at each card's typical redemption rate.</p>
    </Sheet>
  )
}

export function AddCardSheet({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (type: CardType, last4: string) => void }) {
  const [type, setType] = useState<CardType | null>(null)
  const [last4, setLast4] = useState('')
  const valid = !!type && /^\d{4}$/.test(last4)
  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) {
      setType(null)
      setLast4('')
    }
  }
  return (
    <Sheet open={open} onOpenChange={close} title="Add a card" hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetTitle sub="Demo cards only">Add a card</SheetTitle>
      <div className="border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        {templates.map((c) => (
          <RowButton key={c.type} onClick={() => setType(c.type)} selected={type === c.type}>
            <span className="block h-[30px] w-[48px] shrink-0 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
              <CardArt card={c} size="mini" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-medium">{c.name}</span>
              <span className={`block text-[14px] ${muted}`}>{c.issuer}</span>
            </span>
            {type === c.type ? <CheckIcon size={20} weight="bold" className="text-[#0F7B4A]" /> : null}
          </RowButton>
        ))}
      </div>
      <label htmlFor="ledger-last4" className="block pt-6 text-[13px] font-semibold uppercase tracking-[1.2px]">
        Last four digits
      </label>
      <input
        id="ledger-last4"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={last4}
        onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
        placeholder="0042"
        className="mt-1 h-12 w-full border-b border-[#141414] bg-transparent text-[22px] tracking-[6px] tabular-nums outline-none placeholder:text-[#141414]/30 focus:border-b-2"
      />
      <p className={`pb-5 pt-2 text-[14px] ${muted}`}>Never enter a real card number.</p>
      <PrimaryButton
        disabled={!valid}
        onClick={() => {
          if (!type) return
          onAdd(type, last4)
          close(false)
        }}
      >
        Add card
      </PrimaryButton>
    </Sheet>
  )
}

export function CardDetailsSheet({ open, onOpenChange, card }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null }) {
  if (!card) return null
  const fmt = (n: number) => (card.reward_type === 'cash' ? `${n}%` : mult(n))
  const earns = [
    ...Object.entries(card.category_rates).map(([k, v]) => [categoryLabel[k] ?? k, v] as const),
    ...Object.entries(card.merchant_rates).map(([k, v]) => [k.replace(/-/g, ' '), v] as const),
  ]
  const facts: [string, string][] = [
    ['Number', `•••• ${card.last4}`],
    ['Issuer', card.issuer],
    ['Network', networkName(card.network)],
    ['Rewards', card.reward_type === 'points' ? `Points, about ${card.cpp}¢ each` : 'Cash back'],
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${card.name} details`} hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetTitle sub="Card details">{card.name}</SheetTitle>
      <dl className="border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        {facts.map(([k, v]) => (
          <div key={k} className={`flex justify-between py-3 text-[16px] ${hairline}`}>
            <dt className={muted}>{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="pb-2 pt-7 text-[13px] font-semibold uppercase tracking-[1.2px]">Earns</p>
      <dl className="border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        {earns.map(([k, v]) => (
          <div key={k} className={`flex justify-between py-3 text-[16px] ${hairline}`}>
            <dt className="capitalize">{k}</dt>
            <dd className="tabular-nums">{fmt(v)}</dd>
          </div>
        ))}
        <div className={`flex justify-between py-3 text-[16px] ${hairline}`}>
          <dt>Everything else</dt>
          <dd className="tabular-nums">
            {fmt(card.base_rate)}
            {card.reward_type === 'points' ? <span className={muted}> · ≈{pct(card.base_rate * card.cpp)}</span> : null}
          </dd>
        </div>
      </dl>
    </Sheet>
  )
}

export function ConfirmRemoveSheet({ open, onOpenChange, card, onRemove }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null; onRemove: () => void }) {
  if (!card) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Remove ${card.name}?`} hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetTitle>Remove {card.name}?</SheetTitle>
      <p className={`max-w-[34ch] pb-6 text-[16px] ${muted}`}>It stops being considered for recommendations. Past purchases stay on your scorecard.</p>
      <button
        type="button"
        onClick={onRemove}
        className={`h-[52px] w-full rounded-full text-[16px] font-semibold text-[#B42318] shadow-[inset_0_0_0_1px_rgba(180,35,24,0.6)] active:scale-[0.98] ${focusRing}`}
      >
        Remove card
      </button>
      <button type="button" onClick={() => onOpenChange(false)} className={`mt-2 h-11 w-full text-[15px] font-medium ${focusRing}`}>
        Keep it
      </button>
    </Sheet>
  )
}
