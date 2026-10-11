import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { cardById, deals, type Deal, type DealFeed } from '../../data/data'
import { playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Sheet } from '../../shared/Sheet'
import { handle, panel } from './sheets'
import { CardArt, Masthead, MerchantMark, focusRing, hairline, muted, serif } from './ui'

const LABEL: Record<DealFeed, string> = { meals: 'Meals', clothing: 'Clothing', travel: 'Travel' }

export function DealsScreen() {
  const [feed, setFeed] = useState<DealFeed>('meals')
  const [open, setOpen] = useState<Deal | null>(null)
  const category = deals.categories.find((c) => c.id === feed)!
  const [lead, ...rest] = category.deals

  return (
    <div className="pb-28">
      <Masthead title="Deals" kicker="Today's best stacks" />
      <div role="tablist" aria-label="Deal category" className={`mx-5 flex gap-6 ${hairline}`}>
        {deals.categories.map((c) => {
          const on = feed === c.id
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={on}
              onClick={() => {
                playTick()
                setFeed(c.id)
              }}
              className={`relative h-11 text-[16px] transition-colors duration-150 font-semibold ${on ? 'text-[#141414]' : 'text-[#5E5D58]'} ${focusRing}`}
            >
              {LABEL[c.id]}
              {on ? <motion.span layoutId="l-deal-tab" className="absolute inset-x-0 -bottom-px h-[2px] bg-[#141414]" transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }} /> : null}
            </button>
          )
        })}
      </div>
      <p className={`mx-5 pt-2.5 text-[14px] ${muted}`}>Ranked by dollars back on a typical order. Coupons are demo offers.</p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={feed}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
          className="px-5"
        >
          <button type="button" onClick={() => setOpen(lead)} className={`block w-full pb-6 pt-7 text-left ${hairline} ${focusRing}`}>
            <span className="flex items-center gap-2.5">
              <MerchantMark id={lead.merchant.id} name={lead.merchant.name} size={28} />
              <span className="text-[16px] font-semibold">{lead.merchant.name}</span>
              <span className={`${serif} ml-auto text-[18px] italic text-[#0F7B4A]`}>Top stack</span>
            </span>
            <span className={`${serif} block pt-3 text-[76px] leading-[76px] tracking-[-1.5px]`}>{money(lead.total_value_cents)}</span>
            <span className="block pt-1 text-[16px] leading-[23px]">
              back on a {money(lead.example_subtotal_cents)} order
              <span className={muted}>
                {' '}
                · {lead.coupon ? `${lead.coupon.coupon.code} with ` : ''}
                {lead.winner_card_name}
              </span>
            </span>
          </button>
          <ol>
            {rest.map((d, i) => (
              <li key={d.merchant.id} className={hairline}>
                <button type="button" onClick={() => setOpen(d)} className={`flex min-h-[68px] w-full items-center gap-3.5 py-3 text-left transition-colors duration-150 active:bg-[#141414]/[0.03] ${focusRing}`}>
                  <span className={`${serif} w-5 shrink-0 text-[24px] italic leading-none ${muted}`}>{i + 2}</span>
                  <MerchantMark id={d.merchant.id} name={d.merchant.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-medium">{d.merchant.name}</span>
                    <span className={`block truncate text-[14px] ${muted}`}>
                      {d.coupon ? `${d.coupon.coupon.code} + ` : ''}
                      {d.winner_card_name}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="block text-[16px] font-semibold">{money(d.total_value_cents)}</span>
                    <span className={`block text-[14px] ${muted}`}>{Math.round(d.total_value_pct)}% back</span>
                  </span>
                  <CaretRightIcon size={14} className="shrink-0 text-[#5E5D58]" />
                </button>
              </li>
            ))}
          </ol>
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
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()} title={`${d.merchant.name} stack`} hideTitle panelClassName={panel} handleClassName={handle}>
      <div className="pb-5 pt-2">
        <span className="flex items-center gap-2.5">
          <MerchantMark id={d.merchant.id} name={d.merchant.name} size={28} />
          <span className="text-[16px] font-semibold">{d.merchant.name}</span>
        </span>
        <p className={`${serif} pt-3 text-[64px] leading-[64px] tracking-[-1px] text-[#0F7B4A]`}>{money(d.total_value_cents)}</p>
        <p className="pt-1 text-[16px]">back on a typical {money(d.example_subtotal_cents)} order</p>
      </div>
      <dl className="border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        <div className={`flex items-center gap-3 py-3.5 ${hairline}`}>
          <span className="w-12 shrink-0 text-[13px] font-semibold uppercase tracking-[1.2px]">Code</span>
          <dt className="min-w-0 flex-1">
            {d.coupon ? (
              <>
                <span className="block font-[family-name:var(--font-mono)] text-[16px] font-semibold">{d.coupon.coupon.code}</span>
                <span className={`block text-[14px] ${muted}`}>{d.coupon.coupon.description}</span>
              </>
            ) : (
              <span className={`text-[16px] ${muted}`}>No coupon today</span>
            )}
          </dt>
          <dd className="text-[16px] tabular-nums text-[#0F7B4A]">{d.coupon ? `−${money(d.coupon.savings_cents)}` : ''}</dd>
        </div>
        {card ? (
          <div className={`flex items-center gap-3 py-3.5 ${hairline}`}>
            <span className="w-12 shrink-0 text-[13px] font-semibold uppercase tracking-[1.2px]">Card</span>
            <dt className="flex min-w-0 flex-1 items-center gap-3">
              <span className="block h-[26px] w-[40px] shrink-0 rounded-[4px] shadow-[0_1px_2px_rgba(20,20,20,0.18)]">
                <CardArt card={card} size="mini" />
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-medium">{card.name}</span>
                <span className={`block text-[14px] ${muted}`}>
                  {d.card_yield_pct}% back on {money(charge)}
                </span>
              </span>
            </dt>
            <dd className="text-[16px] tabular-nums text-[#0F7B4A]">+{money(d.rewards_value_cents)}</dd>
          </div>
        ) : null}
      </dl>
      <p className={`pt-4 text-[14px] ${muted}`}>Demo coupon, not a verified offer. Card value uses the cards in your wallet.</p>
    </Sheet>
  )
}
