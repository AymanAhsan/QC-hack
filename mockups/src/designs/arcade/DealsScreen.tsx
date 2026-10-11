import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AirplaneTiltIcon, CaretRightIcon, ForkKnifeIcon, TShirtIcon, type Icon } from '@phosphor-icons/react'
import { deals, type Deal, type DealFeed } from '../../data/data'
import { playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import type { DemoSession } from '../../shared/session'
import { Hud } from './Hud'
import { DealSheet } from './sheets'
import { MerchantMark, Push, calmSpring } from './ui'

const FEEDS: Record<DealFeed, { label: string; icon: Icon }> = {
  meals: { label: 'Meals', icon: ForkKnifeIcon },
  clothing: { label: 'Clothing', icon: TShirtIcon },
  travel: { label: 'Travel', icon: AirplaneTiltIcon },
}

export function DealsScreen({ session, onRewards }: { session: DemoSession; onRewards: () => void }) {
  const [feed, setFeed] = useState<DealFeed>('meals')
  const [open, setOpen] = useState<Deal | null>(null)
  const category = deals.categories.find((c) => c.id === feed)!

  return (
    <div className="pb-36">
      <Hud session={session} title="Deals" onRewards={onRewards} />
      <div role="tablist" aria-label="Deal category" className="grid grid-cols-3 gap-2.5 px-4">
        {deals.categories.map((c) => {
          const on = feed === c.id
          const { label, icon: I } = FEEDS[c.id]
          return (
            <Push
              key={c.id}
              role="tab"
              aria-selected={on}
              tone={on ? 'jade' : 'tile'}
              depth={4}
              radius={16}
              pressed={on}
              onClick={() => {
                playTick()
                setFeed(c.id)
              }}
              faceClassName="h-12 gap-1.5 text-[16px] font-black"
            >
              <I size={19} weight={on ? 'fill' : 'bold'} />
              {label}
            </Push>
          )
        })}
      </div>
      <p className="px-5 pb-1 pt-4 text-[13px] font-bold text-[#8A8075]">Ranked by dollars back on a typical order · demo coupons</p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={feed}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
          transition={calmSpring}
          className="space-y-3.5 px-4 pt-3"
        >
          {category.deals.map((d, i) => (
            <li key={d.merchant.id}>
              <Push depth={5} radius={22} className="w-full" faceClassName="justify-start gap-3 px-3.5 py-3.5 text-left" onClick={() => setOpen(d)}>
                <MerchantMark id={d.merchant.id} name={d.merchant.name} size={46} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[18px] font-black">{d.merchant.name}</span>
                    {i === 0 ? (
                      <span className="shrink-0 rounded-full bg-[#1FCB82] px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.6px] shadow-[0_2px_0_#12935C]">Top</span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[14px] font-bold text-[#6B6257]">
                    {d.coupon ? `${d.coupon.coupon.code} + ` : ''}
                    {d.winner_card_name}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block text-[20px] font-black leading-tight text-[#0B7D4D]">{money(d.total_value_cents)}</span>
                  <span className="block text-[13px] font-extrabold text-[#6B6257]">{Math.round(d.total_value_pct)}% back</span>
                </span>
                <CaretRightIcon size={18} weight="bold" className="shrink-0 text-[#C9BCA8]" />
              </Push>
            </li>
          ))}
        </motion.ul>
      </AnimatePresence>

      <DealSheet deal={open} onClose={() => setOpen(null)} />
    </div>
  )
}
