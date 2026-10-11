import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircleIcon, CheckIcon, InfoIcon, TicketIcon, XCircleIcon } from '@phosphor-icons/react'
import { cardById, cards as templates, categoryLabel, locations, nikeStack, type Card, type CardType, type Deal, type RecommendResponse } from '../../data/data'
import { Sheet } from '../../shared/Sheet'
import { money, mult, pct } from '../../shared/format'
import { runnerUpLine, scanRanking, whyChecks } from '../../shared/derive'
import { playTick } from '../../shared/feedback'
import { A, CardArt, MerchantMark, Push, Row, Tile, cardEdge } from './ui'

// Sheets portal outside the .arcade root, so they carry the scope class themselves.
const panel = 'arcade rounded-t-[28px] bg-[#FFF7EC] text-[#1F1F1F] font-[family-name:var(--font-nunito)]'
const handle = 'bg-[#D9CCB6]'

function SheetHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pb-5 pt-2 text-center">
      <div className="text-[24px] font-black leading-tight tracking-[-0.3px]">{title}</div>
      {sub ? <div className="pt-1 text-[15px] font-semibold text-[#6B6257]">{sub}</div> : null}
    </div>
  )
}

const label = 'px-1 pb-2 pt-6 text-[13px] font-extrabold uppercase tracking-[1px] text-[#6B6257]'

export function StoreSheet({ open, onOpenChange, storeId, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; storeId: string | null; onPick: (id: string | null) => void }) {
  const sorted = [...locations].sort((a, b) => a.distance_m - b.distance_m)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Where are you shopping?" hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetHead title="Where are you?" sub="Demo stores near Union Square" />
      <div className="space-y-3">
        {sorted.map((l) => {
          const on = l.id === storeId
          return (
            <Push
              key={l.id}
              tone={on ? 'jade' : 'tile'}
              depth={4}
              radius={18}
              className="w-full"
              faceClassName="justify-start gap-3 px-3 py-2.5 text-left"
              onClick={() => onPick(l.id)}
              aria-pressed={on}
            >
              <MerchantMark id={l.merchant.id} name={l.merchant.name} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-extrabold">{l.merchant.name}</span>
                <span className={`block text-[14px] font-semibold ${on ? 'text-[#1F1F1F]/75' : 'text-[#6B6257]'}`}>
                  {categoryLabel[l.merchant.category] ?? l.merchant.category_label} · {l.distance_m} m
                </span>
              </span>
              {on ? <CheckIcon size={22} weight="bold" /> : null}
            </Push>
          )
        })}
      </div>
      {storeId ? (
        <Push className="mt-5 w-full" faceClassName="h-12 text-[17px] font-extrabold" onClick={() => onPick(null)}>
          I'm not at a store
        </Push>
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
    <Sheet open={open} onOpenChange={onOpenChange} title={`Why ${winner?.card_name}`} hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetHead title={`Why ${winner?.card_name} wins`} sub={`${rec.merchant.name} · ${money(rec.amount_cents)}`} />
      <Tile>
        {whyChecks(rec).map((c, i, all) => (
          <Row
            key={c.label}
            leading={
              c.ok === true ? (
                <CheckCircleIcon size={26} weight="fill" className="text-[#1FCB82]" />
              ) : c.ok === false ? (
                <XCircleIcon size={26} weight="fill" className="text-[#A79C8E]" />
              ) : (
                <InfoIcon size={26} weight="fill" className="text-[#6B6257]" />
              )
            }
            title={<span className="whitespace-normal">{c.label}</span>}
            subtitle={c.detail ? <span className="whitespace-normal">{c.detail}</span> : undefined}
            last={i === all.length - 1}
          />
        ))}
      </Tile>
      <div className={label}>Every card, here</div>
      <Tile className="space-y-3.5 p-4">
        {rec.ranking.map((r) => (
          <div key={r.card_id} className={r.accepted ? '' : 'opacity-55'}>
            <div className="flex items-baseline justify-between text-[15px] font-extrabold">
              <span>{r.card_name}</span>
              <span className={`tabular-nums ${r.is_winner ? 'text-[#0B7D4D]' : ''}`}>{r.accepted ? money(r.value_cents) : 'Not accepted'}</span>
            </div>
            {r.accepted ? (
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[#F4EADB]">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{ background: r.is_winner ? A.jade : '#D9CCB6' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: r.value_cents / max }}
                  transition={{ type: 'spring', duration: 0.7, bounce: 0.15 }}
                />
              </div>
            ) : null}
          </div>
        ))}
      </Tile>
      {runner ? <p className="px-1 pt-4 text-[14px] font-semibold text-[#6B6257]">{runner}. Points valued at each card's typical redemption rate.</p> : null}
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
      <SheetHead title="Add a card" sub="Pick the card, then its last four digits" />
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Card type">
        {templates.map((c) => {
          const on = type === c.type
          return (
            <button
              key={c.type}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                playTick()
                setType(c.type)
              }}
              className="group relative rounded-[16px] outline-offset-4 focus-visible:outline-[3px] focus-visible:outline-[#1F1F1F]"
            >
              <span
                className="block aspect-[340/214] overflow-hidden rounded-[16px] transition-transform duration-150 group-active:scale-[0.97]"
                style={{ boxShadow: on ? `0 0 0 3px #FFF7EC, 0 0 0 6px ${A.jade}` : `0 4px 0 ${cardEdge(c)}` }}
              >
                <CardArt card={c} mini />
              </span>
              {on ? (
                <span className="absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full bg-[#1FCB82] shadow-[0_2px_0_#12935C]">
                  <CheckIcon size={16} weight="bold" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <label htmlFor="arcade-last4" className={`block ${label}`}>
        Last four digits
      </label>
      <input
        id="arcade-last4"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={last4}
        onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
        placeholder="0042"
        className="h-14 w-full rounded-[18px] border-2 border-[#EADFCC] bg-white px-4 text-[20px] font-extrabold tracking-[4px] tabular-nums text-[#1F1F1F] shadow-[0_4px_0_#EADFCC] placeholder:text-[#C9BCA8] focus:border-[#1FCB82] focus:outline-none"
      />
      <p className="px-1 pt-2 text-[14px] font-semibold text-[#6B6257]">Demo cards only. Never enter a real card number.</p>
      <Push
        tone={valid ? 'jade' : 'tile'}
        disabled={!valid}
        className="mt-6 w-full"
        faceClassName="h-14 text-[18px] font-black"
        onClick={() => {
          if (!type) return
          onAdd(type, last4)
          close(false)
        }}
      >
        Add card
      </Push>
    </Sheet>
  )
}

export function CardDetailsSheet({ open, onOpenChange, card }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null }) {
  if (!card) return null
  const unit = card.reward_type === 'cash' ? '%' : '×'
  const fmt = (n: number) => (unit === '%' ? `${n}%` : mult(n))
  const rows = [
    ...Object.entries(card.category_rates).map(([k, v]) => [categoryLabel[k] ?? k, v] as const),
    ...Object.entries(card.merchant_rates).map(([k, v]) => [k.replace(/-/g, ' '), v] as const),
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${card.name} details`} hideTitle panelClassName={panel} handleClassName={handle}>
      <div className="mx-auto mb-6 mt-2 aspect-[340/214] w-[230px] overflow-hidden rounded-[18px]" style={{ boxShadow: `0 6px 0 ${cardEdge(card)}` }}>
        <CardArt card={card} />
      </div>
      <Tile>
        <Row title="Card number" trailing={<span className="font-extrabold tabular-nums text-[#6B6257]">•••• {card.last4}</span>} />
        <Row title="Issuer" trailing={<span className="font-bold text-[#6B6257]">{card.issuer}</span>} />
        <Row title="Network" trailing={<span className="font-bold capitalize text-[#6B6257]">{card.network}</span>} />
        <Row title="Rewards" trailing={<span className="font-bold text-[#6B6257]">{card.reward_type === 'points' ? `Points · ${card.cpp}¢ each` : 'Cash back'}</span>} last />
      </Tile>
      <div className={label}>Earns</div>
      <Tile>
        {rows.map(([k, v]) => (
          <Row key={k} title={<span className="capitalize">{k}</span>} trailing={<span className="text-[17px] font-black tabular-nums">{fmt(v)}</span>} />
        ))}
        <Row
          title="Everything else"
          subtitle={card.reward_type === 'points' ? `≈ ${pct(card.base_rate * card.cpp)} back` : undefined}
          trailing={<span className="text-[17px] font-black tabular-nums">{fmt(card.base_rate)}</span>}
          last
        />
      </Tile>
    </Sheet>
  )
}

export function ConfirmRemoveSheet({ open, onOpenChange, card, onRemove }: { open: boolean; onOpenChange: (o: boolean) => void; card: Card | null; onRemove: () => void }) {
  if (!card) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Remove ${card.name}?`} hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetHead title={`Remove ${card.name}?`} sub="It stops being considered. Past purchases stay in Rewards." />
      <Push tone="ink" className="w-full" faceClassName="h-14 text-[18px] font-black" onClick={onRemove}>
        Remove card
      </Push>
      <Push className="mt-3 w-full" faceClassName="h-14 text-[18px] font-extrabold" onClick={() => onOpenChange(false)}>
        Keep it
      </Push>
    </Sheet>
  )
}

export function DealSheet({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const [last, setLast] = useState<Deal | null>(deal)
  if (deal && deal !== last) setLast(deal)
  const d = deal ?? last
  if (!d) return null
  const card = d.winner_card_id ? cardById[d.winner_card_id] : null
  const charge = d.example_subtotal_cents - (d.coupon?.savings_cents ?? 0)
  return (
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()} title={`${d.merchant.name} stack`} hideTitle panelClassName={panel} handleClassName={handle}>
      <div className="flex flex-col items-center pb-6 pt-3 text-center">
        <MerchantMark id={d.merchant.id} name={d.merchant.name} size={60} />
        <div className="pt-3 text-[22px] font-black">{d.merchant.name}</div>
        <div className="text-[48px] font-black leading-[56px] tracking-[-1px] tabular-nums text-[#0B7D4D]">{money(d.total_value_cents)}</div>
        <div className="text-[15px] font-semibold text-[#6B6257]">back on a typical {money(d.example_subtotal_cents)} order</div>
      </div>
      <Tile>
        {d.coupon ? (
          <Row
            leading={
              <span className="grid size-10 place-items-center rounded-[13px] bg-[#FF9A2E] shadow-[0_3px_0_#D66F00]">
                <TicketIcon size={22} weight="fill" className="text-[#1F1F1F]" />
              </span>
            }
            title={<span className="tracking-[1px]">{d.coupon.coupon.code}</span>}
            subtitle={d.coupon.coupon.description}
            trailing={<span className="text-[17px] font-black tabular-nums text-[#0B7D4D]">−{money(d.coupon.savings_cents)}</span>}
          />
        ) : (
          <Row title="No coupon today" subtitle="The card does all the work" />
        )}
        {card ? (
          <Row
            leading={
              <span className="block h-[28px] w-[44px] overflow-hidden rounded-[7px]">
                <CardArt card={card} bare />
              </span>
            }
            title={card.name}
            subtitle={`${d.card_yield_pct}% back on ${money(charge)}`}
            trailing={<span className="text-[17px] font-black tabular-nums text-[#0B7D4D]">+{money(d.rewards_value_cents)}</span>}
            last
          />
        ) : null}
      </Tile>
      <p className="px-1 pt-4 text-[14px] font-semibold text-[#6B6257]">Demo coupon, not a verified offer. Card value uses your wallet.</p>
    </Sheet>
  )
}

export function WhyStackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const stack = nikeStack
  const ranking = scanRanking()
  const max = Math.max(...ranking.map((r) => r.value_cents), 1)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Why this stack" hideTitle panelClassName={panel} handleClassName={handle}>
      <SheetHead title="Why this stack" sub={`${stack.merchant.name} · ${money(stack.subtotal_cents)} cart`} />
      <div className={`${label} !pt-0`}>Coupons checked</div>
      <Tile>
        {stack.coupons_considered.map((c, i, all) => {
          const used = c.coupon.code === stack.coupon?.coupon.code
          return (
            <Row
              key={c.coupon.code}
              title={
                <span className="flex items-center gap-2 tracking-[1px]">
                  {c.coupon.code}
                  {used ? <span className="rounded-full bg-[#E3F7EC] px-2 py-0.5 text-[11px] font-black tracking-[0.5px] text-[#0B7D4D]">USED</span> : null}
                </span>
              }
              subtitle={c.eligible ? c.coupon.description : c.reason}
              trailing={<span className={`font-black tabular-nums ${used ? 'text-[#0B7D4D]' : 'text-[#A79C8E]'}`}>{c.eligible ? `−${money(c.savings_cents)}` : 'N/A'}</span>}
              last={i === all.length - 1}
            />
          )
        })}
      </Tile>
      <div className={label}>Cards on {money(stack.charge_cents)}</div>
      <Tile className="space-y-3.5 p-4">
        {ranking.map((r) => (
          <div key={r.card_id}>
            <div className="flex justify-between text-[15px] font-extrabold">
              <span>{r.card.name}</span>
              <span className={`tabular-nums ${r.is_winner ? 'text-[#0B7D4D]' : ''}`}>{money(r.value_cents)}</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[#F4EADB]">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ background: r.is_winner ? A.jade : '#D9CCB6' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.value_cents / max }}
                transition={{ type: 'spring', duration: 0.7, bounce: 0.15 }}
              />
            </div>
          </div>
        ))}
      </Tile>
    </Sheet>
  )
}
