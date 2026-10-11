import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircleIcon, CheckIcon, InfoIcon, XCircleIcon } from '@phosphor-icons/react'
import { cardById, cards as templates, categoryLabel, locations, type Card, type CardType, type RecommendResponse } from '../../data/data'
import { Sheet } from '../../shared/Sheet'
import { money, mult } from '../../shared/format'
import { runnerUpLine, whyChecks } from '../../shared/derive'
import { CardArt, Label, MerchantMark, PrimaryButton, Row, StatBar, cardStats } from './ui'

export const sheetPanel = 'rounded-t-[24px] bg-[#13161D] text-[#EEF0F4] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] font-[family-name:var(--font-grotesk)]'
export const sheetHandle = 'bg-white/25'

export function SheetTitle({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <div className="pb-4 pt-2">
      {kicker ? <Label>{kicker}</Label> : null}
      <div className="text-[22px] font-semibold tracking-[-0.01em]">{title}</div>
    </div>
  )
}

export function StoreSheet({
  open,
  onOpenChange,
  storeId,
  onPick,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  storeId: string | null
  onPick: (id: string | null) => void
}) {
  const sorted = [...locations].sort((a, b) => a.distance_m - b.distance_m)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Choose a store" panelClassName={sheetPanel} handleClassName={sheetHandle} hideTitle>
      <SheetTitle kicker="Demo stores · Union Square" title="Where are you?" />
      <div className="-mx-1 overflow-hidden rounded-[16px] bg-[#1A1E27]">
        {sorted.map((l, i) => (
          <Row
            key={l.id}
            leading={<MerchantMark id={l.merchant.id} name={l.merchant.name} size={34} />}
            title={l.merchant.name}
            subtitle={`${categoryLabel[l.merchant.category] ?? l.merchant.category_label} · ${l.distance_m} m`}
            trailing={l.id === storeId ? <CheckIcon size={20} weight="bold" className="text-[#9BE36D]" /> : <span className="font-mono text-[13px] tabular-nums text-[#9BA3B1]">{money(l.merchant.typical_cents)}</span>}
            onClick={() => onPick(l.id)}
            last={i === sorted.length - 1}
          />
        ))}
      </div>
      {storeId ? (
        <button type="button" onClick={() => onPick(null)} className="mt-3 h-12 w-full rounded-[14px] text-[16px] font-medium text-[#EEF0F4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] active:bg-white/5">
          I'm not at a store
        </button>
      ) : null}
    </Sheet>
  )
}

export function WhySheet({ open, onOpenChange, rec }: { open: boolean; onOpenChange: (o: boolean) => void; rec: RecommendResponse | null }) {
  if (!rec) return null
  const winner = rec.ranking.find((r) => r.is_winner)
  const accepted = rec.ranking.filter((r) => r.accepted)
  const max = Math.max(1, ...accepted.map((r) => r.value_cents))
  const runner = runnerUpLine(rec)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Why ${winner?.card_name}`} panelClassName={sheetPanel} handleClassName={sheetHandle} hideTitle>
      <SheetTitle kicker={`${rec.merchant.name} · ${money(rec.amount_cents)}`} title={`Why ${winner?.card_name} is recommended`} />
      <ul className="space-y-3 pb-6">
        {whyChecks(rec).map((c) => (
          <li key={c.label} className="flex gap-3">
            {c.ok === true ? (
              <CheckCircleIcon size={22} weight="fill" className="shrink-0 text-[#9BE36D]" />
            ) : c.ok === false ? (
              <XCircleIcon size={22} weight="fill" className="shrink-0 text-[#9BA3B1]" />
            ) : (
              <InfoIcon size={22} weight="fill" className="shrink-0 text-[#9BA3B1]" />
            )}
            <div>
              <div className={`text-[16px] leading-[22px] ${c.ok === false ? 'text-[#9BA3B1] line-through decoration-1' : ''}`}>{c.label}</div>
              {c.detail ? <div className="font-mono text-[12px] leading-[18px] text-[#9BA3B1]">{c.detail}</div> : null}
            </div>
          </li>
        ))}
      </ul>
      <Label>Every card, here</Label>
      <ol className="mt-3 space-y-3">
        {rec.ranking.map((r, i) => (
          <li key={r.card_id} className={r.accepted ? '' : 'opacity-45'}>
            <div className="flex items-center justify-between gap-3 text-[14px]">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="w-5 font-mono text-[12px] text-[#9BA3B1]">{r.accepted ? String(i + 1).padStart(2, '0') : '--'}</span>
                <span className="block h-[18px] w-[28px] shrink-0">
                  <CardArt card={cardById[r.card_id]} mini />
                </span>
                <span className="truncate">{r.card_name}</span>
              </span>
              <span className={`font-mono tabular-nums ${r.is_winner ? 'text-[#9BE36D]' : ''}`}>{r.accepted ? money(r.value_cents) : 'Locked'}</span>
            </div>
            {r.accepted ? (
              <div className="ml-[30px] mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{ background: r.is_winner ? '#9BE36D' : 'rgba(238,240,244,0.45)' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: r.value_cents / max }}
                  transition={{ type: 'spring', duration: 0.6, bounce: 0, delay: i * 0.04 }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      {runner ? <p className="pt-5 text-[13px] text-[#9BA3B1]">{runner}. Points valued at each card's typical redemption rate.</p> : null}
    </Sheet>
  )
}

export function AddCardSheet({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (type: CardType, last4: string) => void }) {
  const [type, setType] = useState<CardType | null>(null)
  const [last4, setLast4] = useState('')
  const valid = type && /^\d{4}$/.test(last4)
  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) {
      setType(null)
      setLast4('')
    }
  }
  return (
    <Sheet open={open} onOpenChange={close} title="Add a card" panelClassName={sheetPanel} handleClassName={sheetHandle} hideTitle>
      <SheetTitle kicker="New card" title="Add to your loadout" />
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Card type">
        {templates.map((c) => {
          const on = type === c.type
          return (
            <button
              key={c.type}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setType(c.type)}
              className={`rounded-[14px] p-2 text-left transition-[box-shadow,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-[#EEF0F4] ${
                on ? 'bg-[#1A1E27] shadow-[inset_0_0_0_2px_#EEF0F4]' : 'bg-[#1A1E27]/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
              }`}
            >
              <span className="block aspect-[340/214] w-full">
                <CardArt card={c} mini />
              </span>
              <span className="block truncate pt-2 text-[14px] font-medium">{c.name}</span>
              <span className="block truncate text-[12px] text-[#9BA3B1]">{c.issuer}</span>
            </button>
          )
        })}
      </div>
      <label htmlFor="lo-last4" className="block pb-2 pt-5">
        <Label>Last four digits</Label>
      </label>
      <input
        id="lo-last4"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={last4}
        onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
        placeholder="0042"
        className="h-12 w-full rounded-[14px] bg-[#1A1E27] px-4 font-mono text-[17px] tracking-[0.3em] text-[#EEF0F4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-white/25 focus:outline-2 focus:outline-[#EEF0F4]"
      />
      <p className="pt-2 text-[13px] text-[#9BA3B1]">Demo cards only. Never enter a real card number.</p>
      <PrimaryButton
        disabled={!valid}
        className="mt-5"
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
  const unit = card.reward_type === 'cash' ? '%' : '×'
  const fmt = (n: number) => (unit === '%' ? `${n}%` : mult(n))
  const earns = [
    ...Object.entries(card.category_rates).map(([k, v]) => [categoryLabel[k] ?? k, v] as const),
    ...Object.entries(card.merchant_rates).map(([k, v]) => [k.replace(/-/g, ' '), v] as const),
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${card.name} details`} panelClassName={sheetPanel} handleClassName={sheetHandle} hideTitle>
      <SheetTitle kicker={card.issuer} title={card.name} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 pb-6">
        {[
          ['Card', `•••• ${card.last4}`],
          ['Network', card.network === 'amex' ? 'Amex' : card.network === 'visa' ? 'Visa' : 'Mastercard'],
          ['Rewards', card.reward_type === 'points' ? 'Points' : 'Cash back'],
          ['Point value', card.reward_type === 'points' ? `${card.cpp}¢` : '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>
              <Label>{k}</Label>
            </dt>
            <dd className="pt-0.5 font-mono text-[15px] tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <Label>Earn rates</Label>
      <div className="mt-2 overflow-hidden rounded-[16px] bg-[#1A1E27]">
        {earns.map(([k, v]) => (
          <Row key={k} title={<span className="capitalize">{k}</span>} trailing={<span className="font-mono tabular-nums">{fmt(v)}</span>} />
        ))}
        <Row title="Everything else" trailing={<span className="font-mono tabular-nums">{fmt(card.base_rate)}</span>} last />
      </div>
      <div className="mt-6">
        <Label>Stats</Label>
        <div className="mt-3 space-y-2.5">
          {cardStats(card, null, null).map((s) => (
            <StatBar key={s.key} stat={s} accent="#9BE36D" />
          ))}
        </div>
      </div>
    </Sheet>
  )
}

export function ConfirmRemoveSheet({ open, onOpenChange, card, onRemove }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null; onRemove: () => void }) {
  if (!card) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Remove ${card.name}?`} panelClassName={sheetPanel} handleClassName={sheetHandle} hideTitle>
      <SheetTitle title={`Remove ${card.name}?`} />
      <p className="max-w-[34ch] text-[15px] text-[#9BA3B1]">It leaves your loadout and stops being recommended. Past purchases stay in Rewards.</p>
      <button
        type="button"
        onClick={onRemove}
        className="mt-6 h-[52px] w-full rounded-[14px] bg-[#2A1416] text-[17px] font-semibold text-[#FF8A80] shadow-[inset_0_0_0_1px_rgba(255,138,128,0.25)] active:scale-[0.98]"
      >
        Remove card
      </button>
      <button type="button" onClick={() => onOpenChange(false)} className="mt-2 h-12 w-full text-[16px] text-[#EEF0F4]">
        Keep it
      </button>
    </Sheet>
  )
}
