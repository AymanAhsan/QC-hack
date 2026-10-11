import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircleIcon, CheckIcon, InfoIcon, XCircleIcon } from '@phosphor-icons/react'
import { cards as templates, categoryLabel, locations, type Card, type CardType, type RecommendResponse } from '../../data/data'
import { Sheet } from '../../shared/Sheet'
import { money, mult, pct } from '../../shared/format'
import { runnerUpLine, whyChecks } from '../../shared/derive'
import { CardFace, MerchantMark, Row } from './ui'
import { SmoothInput } from './skiper'

const panel = 'n-sheet rounded-t-[28px] text-white'
const handle = 'bg-white/30'

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
    <Sheet open={open} onOpenChange={onOpenChange} title="Where are you?" panelClassName={panel} handleClassName={handle} hideTitle>
      <div className="pb-1 pt-2 text-center text-[17px] font-semibold">Where are you?</div>
      <p className="pb-4 text-center text-[13px] text-[rgba(235,235,245,0.6)]">Nearby · Union Square</p>
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
        <div className="text-[13px] text-[rgba(235,235,245,0.6)]">
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
              {c.detail ? <div className="text-[15px] leading-[20px] text-[rgba(235,235,245,0.6)]">{c.detail}</div> : null}
            </div>
          </li>
        ))}
      </ul>
      <h3 className="px-1 pb-2 pt-6 text-[13px] uppercase tracking-[0.6px] text-[rgba(235,235,245,0.6)]">Every card, here</h3>
      <ul className="space-y-3 n-well rounded-[16px] p-4">
        {rec.ranking.map((r) => (
          <li key={r.card_id} className={r.accepted ? '' : 'opacity-50'}>
            <div className="flex items-baseline justify-between text-[15px]">
              <span className="flex items-center gap-2">
                <span className="h-4 w-6 overflow-hidden rounded-[3px]">
                  <CardFace card={cardsById[r.card_id]} compact />
                </span>
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
        ))}
      </ul>
      {runner ? <p className="px-1 pt-3 text-[13px] text-[rgba(235,235,245,0.6)]">{runner}. Points valued at the card's typical redemption rate.</p> : null}
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
    <Sheet open={open} onOpenChange={close} title="Add a card" panelClassName={panel} handleClassName={handle} hideTitle>
      <div className="pb-4 pt-2 text-center text-[17px] font-semibold">Add a card</div>
      <div className="overflow-hidden n-well rounded-[16px]">
        {templates.map((c, i) => (
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
            last={i === templates.length - 1}
          />
        ))}
      </div>
      <label htmlFor="native-last4" className="block px-1 pb-2 pt-5 text-[13px] uppercase tracking-[0.6px] text-[rgba(235,235,245,0.6)]">
        Last four digits
      </label>
      <SmoothInput
        id="native-last4"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={last4}
        onChange={(v) => setLast4(v.replace(/\D/g, ''))}
        placeholder="0042"
        className="h-12 w-full n-well rounded-[16px] px-4 text-[17px] tracking-[3px] text-white placeholder:text-white/25 focus:outline-2 focus:outline-white/70"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          if (!type) return
          onAdd(type, last4)
          close(false)
        }}
        className="mt-5 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black transition-[opacity,transform] duration-150 active:scale-[0.98] disabled:bg-white/15 disabled:text-white/40"
      >
        Add card
      </button>
    </Sheet>
  )
}

export function CardDetailsSheet({ open, onOpenChange, card }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null }) {
  if (!card) return null
  const rates = Object.entries(card.category_rates)
  const merchants = Object.entries(card.merchant_rates)
  const unit = card.reward_type === 'cash' ? '%' : '×'
  const fmt = (n: number) => (unit === '%' ? `${n}%` : mult(n))
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${card.name} details`} panelClassName={panel} handleClassName={handle} hideTitle>
      <div className="mx-auto mb-5 mt-2 aspect-[340/214] w-[220px]">
        <CardFace card={card} radius={11} live />
      </div>
      <div className="overflow-hidden n-well rounded-[16px]">
        <Row title="Card number" trailing={<span className="font-mono text-[rgba(235,235,245,0.6)]">•••• {card.last4}</span>} />
        <Row title="Issuer" trailing={<span className="text-[rgba(235,235,245,0.6)]">{card.issuer}</span>} />
        <Row title="Network" trailing={<span className="capitalize text-[rgba(235,235,245,0.6)]">{card.network}</span>} />
        <Row
          title="Rewards"
          trailing={<span className="text-[rgba(235,235,245,0.6)]">{card.reward_type === 'points' ? `Points · ${card.cpp}¢ each` : 'Cash back'}</span>}
          last
        />
      </div>
      <h3 className="px-1 pb-2 pt-6 text-[13px] uppercase tracking-[0.6px] text-[rgba(235,235,245,0.6)]">Earns</h3>
      <div className="overflow-hidden n-well rounded-[16px]">
        {[...rates.map(([k, v]) => [categoryLabel[k] ?? k, v] as const), ...merchants.map(([k, v]) => [k.replace(/-/g, ' '), v] as const)].map(([k, v]) => (
          <Row key={k} title={<span className="capitalize">{k}</span>} trailing={<span className="tabular-nums">{fmt(v)}</span>} />
        ))}
        <Row
          title="Everything else"
          trailing={<span className="tabular-nums">{fmt(card.base_rate)}</span>}
          subtitle={card.reward_type === 'points' ? `≈ ${pct(card.base_rate * card.cpp)} back` : undefined}
          last
        />
      </div>
    </Sheet>
  )
}

export function ConfirmRemoveSheet({ open, onOpenChange, card, onRemove }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null; onRemove: () => void }) {
  if (!card) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Remove ${card.name}?`} panelClassName={panel} handleClassName={handle} hideTitle>
      <div className="pb-2 pt-3 text-center">
        <div className="text-[17px] font-semibold">Remove {card.name}?</div>
        <p className="mx-auto max-w-[30ch] pt-1 text-[15px] text-[rgba(235,235,245,0.6)]">It stops being considered for recommendations. Past purchases stay in Rewards.</p>
      </div>
      <button type="button" onClick={onRemove} className="mt-4 h-[50px] w-full n-well rounded-[16px] text-[17px] font-semibold text-[#FF453A] active:bg-white/10">
        Remove card
      </button>
      <button type="button" onClick={() => onOpenChange(false)} className="mt-2 h-[50px] w-full rounded-[12px] text-[17px] text-[#0A84FF]">
        Cancel
      </button>
    </Sheet>
  )
}
