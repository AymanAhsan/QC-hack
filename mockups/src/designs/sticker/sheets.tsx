import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckIcon, InfoIcon, ProhibitIcon } from '@phosphor-icons/react'
import { cardById, cards as templates, categoryLabel, locations, type Card, type CardType, type RecommendResponse } from '../../data/data'
import { Sheet } from '../../shared/Sheet'
import { money, mult } from '../../shared/format'
import { runnerUpLine, whyChecks } from '../../shared/derive'
import { playTick } from '../../shared/feedback'
import { Box, Btn, CardArt, CARD_RATIO, FONT, Label, LinkBtn, MerchantMark, MONO, plainRejection, Press, Row } from './ui'

const THUMB = 72

export const panel = 'rounded-t-[20px] border-2 border-b-0 border-[#111] bg-[#F3EFE6] text-[#111] font-[family-name:var(--font-bricolage)]'
export const handle = 'bg-[#111] opacity-40'

function SheetTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="pb-4 pt-2">
      <div className={`${FONT} text-[28px] font-extrabold leading-[1] tracking-[-0.03em] [font-stretch:85%]`}>{children}</div>
      {sub ? <div className="pt-1.5 text-[14px] font-semibold text-[#4A4741]">{sub}</div> : null}
    </div>
  )
}

export function StoreSheet({ open, onOpenChange, storeId, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; storeId: string | null; onPick: (id: string | null) => void }) {
  const sorted = [...locations].sort((a, b) => a.distance_m - b.distance_m)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Where are you?" hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetTitle sub="Demo stores near Union Square">Where are you?</SheetTitle>
      <Box>
        {sorted.map((l, i) => (
          <Row
            key={l.id}
            first={i === 0}
            leading={<MerchantMark id={l.merchant.id} name={l.merchant.name} size={36} />}
            title={l.merchant.name}
            subtitle={`${categoryLabel[l.merchant.category] ?? l.merchant.category_label} · ${l.distance_m} m away`}
            trailing={
              l.id === storeId ? (
                <span className="grid size-7 place-items-center rounded-full border-2 border-[#111] bg-[#FF5B1F]">
                  <CheckIcon size={15} weight="bold" />
                </span>
              ) : undefined
            }
            onClick={() => onPick(l.id)}
          />
        ))}
      </Box>
      {storeId ? (
        <div className="pt-4">
          <Btn variant="secondary" onClick={() => onPick(null)}>
            I'm not at a store
          </Btn>
        </div>
      ) : null}
    </Sheet>
  )
}

export function WhySheet({ open, onOpenChange, rec }: { open: boolean; onOpenChange: (o: boolean) => void; rec: RecommendResponse | null }) {
  if (!rec) return null
  const winner = rec.ranking.find((r) => r.is_winner)
  const max = Math.max(1, ...rec.ranking.map((r) => r.value_cents))
  const runner = runnerUpLine(rec)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Why ${winner?.card_name}`} hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetTitle sub={`${rec.merchant.name} · ${money(rec.amount_cents)}`}>Why {winner?.card_name} wins</SheetTitle>
      <Box>
        {whyChecks(rec).map((c, i) => (
          <div key={c.label} className={`flex gap-3 px-3.5 py-3 ${i ? 'border-t border-[#111]' : ''}`}>
            <span
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-[6px] border-2 border-[#111] ${c.ok === true ? 'bg-[#0E7A45] text-[#FBF8F1]' : c.ok === false ? 'bg-[#111] text-[#FBF8F1]' : 'bg-[#FBF8F1]'}`}
            >
              {c.ok === true ? <CheckIcon size={13} weight="bold" /> : c.ok === false ? <ProhibitIcon size={13} weight="bold" /> : <InfoIcon size={13} weight="bold" />}
            </span>
            <div className="min-w-0">
              <div className="text-[16px] font-bold leading-[21px]">{c.ok === false ? plainRejection(c.label, rec.merchant.name) : c.label}</div>
              {c.detail ? <div className="text-[14px] leading-[19px] text-[#4A4741]">{c.detail}</div> : null}
            </div>
          </div>
        ))}
      </Box>
      <Label className="pt-6">Every card, here</Label>
      <Box className="space-y-3.5 p-3.5">
        {rec.ranking.map((r) => (
          <div key={r.card_id} className={r.accepted ? '' : 'opacity-55'}>
            <div className="flex items-center justify-between gap-2 text-[15px] font-bold">
              <span className="flex items-center gap-2">
                <span className="block w-[18px]" style={{ height: 18 * CARD_RATIO }}>
                  <CardArt card={cardById[r.card_id]} width={18} />
                </span>
                {r.card_name}
              </span>
              <span className="tabular-nums">{r.accepted ? money(r.value_cents) : `${rec.merchant.name} doesn't take it`}</span>
            </div>
            {r.accepted ? (
              <div className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-[#111] bg-[#FBF8F1]">
                <motion.div
                  className="h-full origin-left"
                  style={{ background: r.is_winner ? '#0E7A45' : '#111' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: r.value_cents / max }}
                  transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
                />
              </div>
            ) : null}
          </div>
        ))}
      </Box>
      {runner ? <p className="px-1 pt-3 text-[14px] font-semibold text-[#4A4741]">{runner}. Points valued at each card's typical rate.</p> : null}
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
      <SheetTitle sub="Pick the card you carry">Add a card</SheetTitle>
      <div role="radiogroup" aria-label="Card type" className="grid grid-cols-3 gap-x-3 gap-y-4 px-1">
        {templates.map((c) => {
          const on = type === c.type
          return (
            <motion.button
              key={c.type}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.name}
              onClick={() => {
                playTick()
                setType(c.type)
              }}
              animate={{ y: on ? -6 : 0 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.3 }}
              className="relative mx-auto block rounded-[7px] outline-offset-[3px] focus-visible:outline-2 focus-visible:outline-[#111]"
              style={{ width: THUMB, height: THUMB * CARD_RATIO, boxShadow: on ? '4px 4px 0 #111' : '0 0 0 #111' }}
            >
              <CardArt card={c} width={THUMB} />
              {on ? (
                <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-[#111] bg-[#FF5B1F]">
                  <CheckIcon size={13} weight="bold" />
                </span>
              ) : null}
            </motion.button>
          )
        })}
      </div>
      <p className="pt-3 text-[15px] font-bold">{type ? templates.find((t) => t.type === type)?.name : 'No card picked yet'}</p>
      <label htmlFor="stk-last4" className="block pb-2 pt-4 text-[13px] font-extrabold uppercase tracking-[0.12em]">
        Last four digits
      </label>
      <input
        id="stk-last4"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={last4}
        onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
        placeholder="0042"
        className={`${MONO} h-[52px] w-full rounded-[12px] border-2 border-[#111] bg-[#FBF8F1] px-4 text-[18px] tracking-[0.3em] placeholder:text-[#111]/30 focus:outline-2 focus:outline-offset-2 focus:outline-[#111]`}
      />
      <p className="pt-2 text-[13px] font-semibold text-[#4A4741]">Demo cards only. Never type a real card number.</p>
      <div className="pt-5">
        <Btn
          disabled={!valid}
          onClick={() => {
            if (!type) return
            onAdd(type, last4)
            close(false)
          }}
        >
          Add card
        </Btn>
      </div>
    </Sheet>
  )
}

export function CardDetailsSheet({ open, onOpenChange, card }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null }) {
  if (!card) return null
  const unit = card.reward_type === 'cash' ? '%' : '×'
  const fmt = (n: number) => (unit === '%' ? `${n}%` : mult(n))
  const rows: [string, number][] = [
    ...Object.entries(card.category_rates).map(([k, v]) => [categoryLabel[k] ?? k, v] as [string, number]),
    ...Object.entries(card.merchant_rates).map(([k, v]) => [titleCase(k.replace(/-/g, ' ')), v] as [string, number]),
    ['Everything else', card.base_rate],
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${card.name} details`} hideTitle panelClassName={panel} handleClassName={handle}>
      <div className="flex items-start gap-4 pb-5 pt-2">
        <span className="block shrink-0 shadow-[3px_3px_0_#111]" style={{ width: 84, height: 84 * CARD_RATIO, borderRadius: 6 }}>
          <CardArt card={card} width={84} />
        </span>
        <div className="min-w-0 pt-1">
          <div className={`${FONT} text-[28px] font-extrabold leading-[1] tracking-[-0.03em] [font-stretch:85%]`}>{card.name}</div>
          <div className="pt-2 text-[14px] font-semibold text-[#4A4741]">{card.issuer}</div>
          <div className={`${MONO} pt-1 text-[14px]`}>•••• {card.last4}</div>
          <div className="pt-1 text-[14px] font-semibold capitalize">{card.network}</div>
        </div>
      </div>
      <Label>Earns</Label>
      <Box>
        {rows.map(([k, v], i) => (
          <Row key={k} first={i === 0} title={k} trailing={<span className="text-[17px] font-extrabold tabular-nums">{fmt(v)}</span>} />
        ))}
      </Box>
      <p className="px-1 pt-3 text-[14px] font-semibold text-[#4A4741]">
        {card.reward_type === 'points' ? `Points valued at ${card.cpp}¢ each.` : 'Cash back, paid as statement credit.'}
      </p>
    </Sheet>
  )
}

export function ConfirmRemoveSheet({ open, onOpenChange, card, onRemove }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null; onRemove: () => void }) {
  if (!card) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Remove ${card.name}?`} hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetTitle sub="It stops being picked at stores. Past purchases stay in Rewards.">Remove {card.name}?</SheetTitle>
      <Press className="flex h-[52px] w-full items-center justify-center rounded-full border-2 border-[#111] bg-[#111] text-[17px] font-extrabold text-[#FBF8F1]" onClick={onRemove}>
        Remove card
      </Press>
      <div className="flex justify-center pt-2">
        <LinkBtn onClick={() => onOpenChange(false)}>Keep it</LinkBtn>
      </div>
    </Sheet>
  )
}


const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())
