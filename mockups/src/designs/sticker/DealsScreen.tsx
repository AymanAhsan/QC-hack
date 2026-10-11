import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AirplaneTiltIcon, ForkKnifeIcon, TicketIcon, TShirtIcon, type Icon } from '@phosphor-icons/react'
import { cardById, deals, type Deal, type DealFeed } from '../../data/data'
import { playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Sheet } from '../../shared/Sheet'
import { handle, panel } from './sheets'
import { Box, CardArt, CARD_RATIO, FONT, MerchantMark, MONO, Press, Row, Title } from './ui'

const FEEDS: { id: DealFeed; label: string; icon: Icon }[] = [
  { id: 'meals', label: 'Meals', icon: ForkKnifeIcon },
  { id: 'clothing', label: 'Clothing', icon: TShirtIcon },
  { id: 'travel', label: 'Travel', icon: AirplaneTiltIcon },
]

const pctRound = (v: number) => `${Math.round(v)}%`

export function DealsScreen() {
  const [feed, setFeed] = useState<DealFeed>('meals')
  const [open, setOpen] = useState<Deal | null>(null)
  const category = deals.categories.find((c) => c.id === feed)!
  const [top, ...rest] = category.deals

  return (
    <div className="pb-36">
      <Title>Deals</Title>
      <div className="px-4">
        <div role="tablist" aria-label="Deal category" className="flex rounded-[14px] border-2 border-[#111] bg-[#FBF8F1] p-1">
          {FEEDS.map(({ id, label, icon: I }) => {
            const on = feed === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  playTick()
                  setFeed(id)
                }}
                className="relative flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[15px] font-extrabold outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[#111]"
              >
                {on ? (
                  <motion.span layoutId="stk-feed" className="absolute inset-0 rounded-[10px] border-2 border-[#111] bg-[#FF5B1F]" transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }} />
                ) : null}
                <I size={18} weight={on ? 'fill' : 'bold'} className="relative" />
                <span className="relative">{label}</span>
              </button>
            )
          })}
        </div>
        <p className="px-1 pt-2.5 text-[13px] font-semibold text-[#4A4741]">Ranked by dollars back on a typical order · demo coupons</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={feed}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          className="space-y-5 px-4 pt-5"
        >
          <Press depth={4} onClick={() => setOpen(top)} className="block w-full overflow-hidden rounded-[14px] border-2 border-[#111] bg-[#FBF8F1] text-left">
            <div className="flex items-center justify-between border-b-2 border-[#111] bg-[#111] px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#FBF8F1]">
              <span>Top stack today</span>
              <span>No. 1</span>
            </div>
            <div className="flex items-center gap-3 px-4 pt-4">
              <MerchantMark id={top.merchant.id} name={top.merchant.name} size={48} />
              <div className="min-w-0">
                <div className={`${FONT} text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>{top.merchant.name}</div>
                <div className="pt-1 text-[14px] font-semibold text-[#4A4741]">
                  {top.coupon ? <span className={`${MONO} font-bold text-[#111]`}>{top.coupon.coupon.code}</span> : 'No coupon'} + {top.winner_card_name}
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between px-4 pb-4 pt-3">
              <span className={`${FONT} text-[52px] font-extrabold leading-[0.9] tracking-[-0.04em] text-[#0E7A45] tabular-nums [font-stretch:82%]`}>{money(top.total_value_cents)}</span>
              <span className="pb-1 text-right text-[14px] font-bold">
                back on {money(top.example_subtotal_cents)}
                <br />
                {pctRound(top.total_value_pct)} of the order
              </span>
            </div>
          </Press>

          <Box>
            {rest.map((d, i) => (
              <Row
                key={d.merchant.id}
                first={i === 0}
                leading={<MerchantMark id={d.merchant.id} name={d.merchant.name} />}
                title={d.merchant.name}
                subtitle={
                  <>
                    {d.coupon ? <span className={`${MONO} font-bold text-[#111]`}>{d.coupon.coupon.code}</span> : 'No coupon'} + {d.winner_card_name}
                  </>
                }
                trailing={
                  <div className="tabular-nums">
                    <div className="text-[17px] font-extrabold text-[#0E7A45]">{money(d.total_value_cents)}</div>
                    <div className="text-[13px] font-bold text-[#4A4741]">{pctRound(d.total_value_pct)} back</div>
                  </div>
                }
                onClick={() => setOpen(d)}
              />
            ))}
          </Box>
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
      <div className="flex items-center gap-3 pb-4 pt-2">
        <MerchantMark id={d.merchant.id} name={d.merchant.name} size={52} />
        <div>
          <div className={`${FONT} text-[28px] font-extrabold leading-none tracking-[-0.03em]`}>{d.merchant.name}</div>
          <div className="pt-1 text-[14px] font-semibold text-[#4A4741]">Typical order {money(d.example_subtotal_cents)}</div>
        </div>
      </div>
      <div className={`${FONT} text-[64px] font-extrabold leading-[0.9] tracking-[-0.045em] text-[#0E7A45] tabular-nums [font-stretch:80%]`}>{money(d.total_value_cents)}</div>
      <div className="pb-5 pt-1 text-[15px] font-bold">back · {pctRound(d.total_value_pct)} of the order</div>
      <Box raised>
        {d.coupon ? (
          <Row
            first
            leading={
              <span className="grid size-10 place-items-center rounded-[10px] border-2 border-[#111] bg-[#FF5B1F]">
                <TicketIcon size={20} weight="bold" />
              </span>
            }
            title={<span className={`${MONO} font-bold`}>{d.coupon.coupon.code}</span>}
            subtitle={d.coupon.coupon.description}
            trailing={<span className="text-[16px] font-extrabold tabular-nums text-[#0E7A45]">−{money(d.coupon.savings_cents)}</span>}
          />
        ) : (
          <Row first title="No coupon today" subtitle="The card does all the work" />
        )}
        {card ? (
          <Row
            leading={
              <span className="flex size-10 items-center justify-center">
                <span className="block w-[25px] shadow-[2px_2px_0_#111]" style={{ height: 25 * CARD_RATIO, borderRadius: 3 }}>
                  <CardArt card={card} width={25} />
                </span>
              </span>
            }
            title={card.name}
            subtitle={`${d.card_yield_pct}% back on ${money(charge)}`}
            trailing={<span className="text-[16px] font-extrabold tabular-nums text-[#0E7A45]">+{money(d.rewards_value_cents)}</span>}
          />
        ) : null}
      </Box>
      <p className="px-1 pt-3 text-[13px] font-semibold text-[#4A4741]">Demo coupon, not a verified offer. Card value uses your wallet.</p>
    </Sheet>
  )
}
