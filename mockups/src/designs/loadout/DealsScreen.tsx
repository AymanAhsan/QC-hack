import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AirplaneIcon, ForkKnifeIcon, TShirtIcon, TicketIcon, type Icon } from '@phosphor-icons/react'
import { cardById, deals, type Deal, type DealFeed } from '../../data/data'
import { playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Sheet } from '../../shared/Sheet'
import { SheetTitle, sheetHandle, sheetPanel } from './sheets'
import { CardArt, Label, MerchantMark, Panel, Row, ScreenHeader } from './ui'

const FEEDS: Record<DealFeed, { label: string; icon: Icon }> = {
  meals: { label: 'Meals', icon: ForkKnifeIcon },
  clothing: { label: 'Clothing', icon: TShirtIcon },
  travel: { label: 'Travel', icon: AirplaneIcon },
}

export function DealsScreen() {
  const [feed, setFeed] = useState<DealFeed>('meals')
  const [open, setOpen] = useState<Deal | null>(null)
  const category = deals.categories.find((c) => c.id === feed)!

  return (
    <div className="pb-32">
      <ScreenHeader kicker="Today's best stacks" title="Deals" />
      <div className="px-5">
        <div role="tablist" aria-label="Deal category" className="flex gap-1 rounded-[14px] bg-[#13161D] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          {deals.categories.map((c) => {
            const on = feed === c.id
            const I = FEEDS[c.id].icon
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  playTick()
                  setFeed(c.id)
                }}
                className={`relative flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#EEF0F4] ${on ? 'text-[#0B0D12]' : 'text-[#9BA3B1]'}`}
              >
                {on ? <motion.span layoutId="lo-deal-seg" className="absolute inset-0 rounded-[10px] bg-[#EEF0F4]" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} /> : null}
                <I size={16} weight={on ? 'fill' : 'regular'} className="relative" />
                <span className="relative">{FEEDS[c.id].label}</span>
              </button>
            )
          })}
        </div>
        <p className="pt-3 font-mono text-[12px] text-[#9BA3B1]">By dollars back on a typical order · demo coupons</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={feed}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          className="px-5 pt-4"
        >
          <Panel>
            <ol>
            {category.deals.map((d, i) => (
              <li key={d.merchant.id}>
                <Row
                  leading={
                    <span className="flex items-center gap-3">
                      <span className={`w-5 font-mono text-[13px] tabular-nums ${i === 0 ? 'text-[#EEF0F4]' : 'text-[#5E6676]'}`}>{String(i + 1).padStart(2, '0')}</span>
                      <MerchantMark id={d.merchant.id} name={d.merchant.name} />
                    </span>
                  }
                  title={d.merchant.name}
                  subtitle={`${d.coupon ? `${d.coupon.coupon.code} + ` : ''}${d.winner_card_name}`}
                  trailing={
                    <div className="font-mono tabular-nums">
                      <div className="text-[16px] text-[#9BE36D]">{money(d.total_value_cents)}</div>
                      <div className="text-[12px] text-[#9BA3B1]">{Math.round(d.total_value_pct)}% back</div>
                    </div>
                  }
                  onClick={() => setOpen(d)}
                  last={i === category.deals.length - 1}
                />
              </li>
            ))}
            </ol>
          </Panel>
        </motion.div>
      </AnimatePresence>

      <DealSheet deal={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function DealSheet({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const [last, setLast] = useState<Deal | null>(deal)
  if (deal && deal !== last) setLast(deal)
  const d = deal ?? last
  if (!d) return null
  const card = d.winner_card_id ? cardById[d.winner_card_id] : null
  const charge = d.example_subtotal_cents - (d.coupon?.savings_cents ?? 0)
  return (
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()} title={`${d.merchant.name} stack`} panelClassName={sheetPanel} handleClassName={sheetHandle} hideTitle>
      <div className="flex items-center gap-3 pt-2">
        <MerchantMark id={d.merchant.id} name={d.merchant.name} size={48} />
        <SheetTitle kicker={`Typical order · ${money(d.example_subtotal_cents)}`} title={d.merchant.name} />
      </div>
      <div className="pb-5">
        <Label>Value back</Label>
        <div className="font-mono text-[46px] font-medium leading-[54px] tabular-nums text-[#9BE36D]">{money(d.total_value_cents)}</div>
        <div className="font-mono text-[13px] tabular-nums text-[#9BA3B1]">{d.total_value_pct.toFixed(1)}% of the order</div>
      </div>
      <div className="overflow-hidden rounded-[16px] bg-[#1A1E27]">
        {d.coupon ? (
          <Row
            leading={
              <span className="grid size-[38px] place-items-center rounded-[10px] bg-[#13161D]">
                <TicketIcon size={20} weight="fill" />
              </span>
            }
            title={<span className="font-mono font-medium">{d.coupon.coupon.code}</span>}
            subtitle={d.coupon.coupon.description}
            trailing={<span className="font-mono tabular-nums text-[#9BE36D]">−{money(d.coupon.savings_cents)}</span>}
          />
        ) : (
          <Row title="No coupon today" subtitle="The card does the work on its own" />
        )}
        {card ? (
          <Row
            leading={
              <span className="block h-[26px] w-[40px]">
                <CardArt card={card} mini />
              </span>
            }
            title={card.name}
            subtitle={`${d.card_yield_pct}% back on ${money(charge)}`}
            trailing={<span className="font-mono tabular-nums text-[#9BE36D]">+{money(d.rewards_value_cents)}</span>}
            last
          />
        ) : null}
      </div>
      <p className="pt-3 text-[12px] text-[#9BA3B1]">Demo coupon, not a verified offer. Card value uses your wallet.</p>
    </Sheet>
  )
}
