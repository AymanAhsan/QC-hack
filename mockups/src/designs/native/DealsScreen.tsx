import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cardById, deals, type Deal, type DealFeed } from '../../data/data'
import { playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Sheet } from '../../shared/Sheet'
import { CardFace, Emoji, LargeTitle, MerchantMark, Row, Section, type EmojiName } from './ui'

const LABEL: Record<DealFeed, string> = { meals: 'Meals', clothing: 'Clothing', travel: 'Travel' }
const ICON: Record<DealFeed, EmojiName> = { meals: 'hamburger', clothing: 't-shirt', travel: 'airplane' }

export function DealsScreen() {
  const [feed, setFeed] = useState<DealFeed>('meals')
  const [open, setOpen] = useState<Deal | null>(null)
  const category = deals.categories.find((c) => c.id === feed)!
  const [top, ...rest] = category.deals

  return (
    <div className="pb-32">
      <LargeTitle>Deals</LargeTitle>
      <div className="px-4 pb-2">
        <div role="tablist" aria-label="Deal category" className="n-panel relative flex rounded-full p-[3px]">
          {deals.categories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={feed === c.id}
              onClick={() => {
                playTick()
                setFeed(c.id)
              }}
              className="relative h-9 flex-1 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-white/70"
            >
              {feed === c.id ? (
                <motion.span layoutId="n-seg" className="absolute inset-0 rounded-full bg-white/[0.2] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />
              ) : null}
              <span className="relative flex items-center justify-center gap-1.5">
                <Emoji name={ICON[c.id]} size={18} />
                {LABEL[c.id]}
              </span>
            </button>
          ))}
        </div>
        <p className="px-1 pt-2 text-[13px] text-[rgba(235,235,245,0.6)]">Ranked by dollars back on a typical order</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={feed}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          className="space-y-6 pt-3"
        >
          <div className="px-4">
            <button
              type="button"
              onClick={() => setOpen(top)}
              className="n-panel relative w-full overflow-hidden rounded-[26px] p-5 text-left transition-transform duration-150 active:scale-[0.985]"
            >
              <div className="flex items-start justify-between">
                <MerchantMark id={top.merchant.id} name={top.merchant.name} size={48} />
                <span className="rounded-full bg-[#30D158]/15 px-2.5 py-1 text-[13px] font-semibold text-[#30D158]">Top stack today</span>
              </div>
              <div className="pt-4 text-[22px] font-bold">{top.merchant.name}</div>
              <div className="text-[15px] text-[rgba(235,235,245,0.6)]">
                {top.coupon ? `${top.coupon.coupon.code} + ` : ''}
                {top.winner_card_name} · typical {money(top.example_subtotal_cents)} order
              </div>
              <div className="flex items-baseline gap-2 pt-4">
                <span className="font-[family-name:var(--font-sf-rounded)] text-[40px] font-bold leading-none text-[#30D158]">{money(top.total_value_cents)}</span>
                <span className="text-[17px] text-[rgba(235,235,245,0.6)]">back · {Math.round(top.total_value_pct)}%</span>
              </div>
            </button>
          </div>
          <Section>
            {rest.map((d, i) => (
              <Row
                key={d.merchant.id}
                leading={<MerchantMark id={d.merchant.id} name={d.merchant.name} />}
                title={d.merchant.name}
                subtitle={`${d.coupon ? `${d.coupon.coupon.code} + ` : ''}${d.winner_card_name}`}
                trailing={
                  <div className="tabular-nums">
                    <div className="text-[17px] text-[#30D158]">{money(d.total_value_cents)}</div>
                    <div className="text-[13px] text-[rgba(235,235,245,0.6)]">{Math.round(d.total_value_pct)}% back</div>
                  </div>
                }
                chevron
                onClick={() => setOpen(d)}
                last={i === rest.length - 1}
              />
            ))}
          </Section>
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
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()} title={`${d.merchant.name} stack`} panelClassName="n-sheet rounded-t-[28px] text-white" handleClassName="bg-white/30" hideTitle>
      <div className="flex flex-col items-center pb-5 pt-3 text-center">
        <MerchantMark id={d.merchant.id} name={d.merchant.name} size={56} />
        <div className="pt-3 text-[22px] font-bold">{d.merchant.name}</div>
        <div className="font-[family-name:var(--font-sf-rounded)] text-[44px] font-bold leading-[52px] text-[#30D158]">{money(d.total_value_cents)}</div>
        <div className="text-[15px] text-[rgba(235,235,245,0.6)]">back on a typical {money(d.example_subtotal_cents)} order</div>
      </div>
      <div className="overflow-hidden n-well rounded-[16px]">
        {d.coupon ? (
          <Row
            leading={<Emoji name="ticket" size={36} />}
            title={<span className="font-mono font-semibold">{d.coupon.coupon.code}</span>}
            subtitle={d.coupon.coupon.description}
            trailing={<span className="tabular-nums text-[#30D158]">−{money(d.coupon.savings_cents)}</span>}
          />
        ) : (
          <Row title="No coupon today" subtitle="The card does all the work" />
        )}
        {card ? (
          <Row
            leading={
              <span className="block h-[26px] w-9">
                <CardFace card={card} compact />
              </span>
            }
            title={card.name}
            subtitle={`${d.card_yield_pct}% back on ${money(charge)}`}
            trailing={<span className="tabular-nums text-[#30D158]">+{money(d.rewards_value_cents)}</span>}
            last
          />
        ) : null}
      </div>
    </Sheet>
  )
}
