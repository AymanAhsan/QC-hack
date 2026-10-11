// Deals: today's best stacks by category, from GET /api/deals. Tapping one shows
// the stack; "Open in Scan" hands it to Scan through the shared navigation contract.
// Owner: Nazeef.

import { useEffect, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api } from '../../api'
import { useNav } from '../../navigation'
import type { Session } from '../../session'
import type { Deal, DealCategory, DealFeed } from '../../types'
import { Sheet } from '../../components/Sheet'
import { CardFace, Emoji, ErrorNotice, LargeTitle, Loading, MerchantMark, Row, Section, type EmojiName } from '../../components/ui'
import { money } from '../../lib/format'
import { playTick } from '../../lib/sound'

const ICON: Record<DealFeed, EmojiName> = { meals: 'hamburger', clothing: 't-shirt', travel: 'airplane' }
const muted = 'text-[rgba(235,235,245,0.6)]'

export function DealsScreen({ session }: { session: Session }) {
  const { openScan } = useNav()
  const [categories, setCategories] = useState<DealCategory[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [feed, setFeed] = useState<DealFeed>('meals')
  const [open, setOpen] = useState<Deal | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setError(null)
    api.deals(undefined, ctrl.signal).then(
      (r) => setCategories(r.categories),
      (e) => !ctrl.signal.aborted && setError(e),
    )
    return () => ctrl.abort()
  }, [attempt])

  const pick = (id: DealFeed) => {
    playTick()
    setFeed(id)
  }
  const onTabKey = (e: KeyboardEvent, index: number) => {
    if (!categories || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return
    const next = categories[(index + (e.key === 'ArrowRight' ? 1 : -1) + categories.length) % categories.length]
    pick(next.id)
    document.getElementById(`deals-tab-${next.id}`)?.focus()
  }

  const category = categories?.find((c) => c.id === feed) ?? null
  const [top, ...rest] = category?.deals ?? []

  return (
    <div className="pb-32">
      <LargeTitle>Deals</LargeTitle>
      {error ? (
        <div className="px-4">
          <ErrorNotice error={error} onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      ) : !categories ? (
        <Loading label="Finding today’s best stacks…" />
      ) : (
        <>
          <div className="px-4 pb-2 wide:max-w-[480px]">
            <div role="tablist" aria-label="Deal category" className="n-panel relative flex rounded-full p-[3px]">
              {categories.map((c, i) => (
                <button
                  key={c.id}
                  id={`deals-tab-${c.id}`}
                  type="button"
                  role="tab"
                  aria-selected={feed === c.id}
                  aria-controls="deals-panel"
                  tabIndex={feed === c.id ? 0 : -1}
                  onClick={() => pick(c.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className="relative h-9 flex-1 rounded-full text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-white/70"
                >
                  {feed === c.id ? (
                    <motion.span layoutId="deals-seg" className="absolute inset-0 rounded-full bg-white/[0.2] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />
                  ) : null}
                  <span className="relative flex items-center justify-center gap-1.5">
                    <Emoji name={ICON[c.id] ?? 'ticket'} size={18} />
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
            <p className={`px-1 pt-2 text-[13px] ${muted}`}>Ranked by dollars back on a typical order, with the cards in your wallet</p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={feed}
              id="deals-panel"
              role="tabpanel"
              aria-labelledby={`deals-tab-${feed}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              className="space-y-6 pt-3 wide:grid wide:grid-cols-2 wide:items-start wide:gap-6 wide:space-y-0"
            >
              {top ? (
                <div className="px-4">
                  <button
                    type="button"
                    onClick={() => setOpen(top)}
                    className="n-panel relative w-full overflow-hidden rounded-[26px] p-5 text-left transition-transform duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-white/70"
                  >
                    <div className="flex items-start justify-between">
                      <MerchantMark id={top.merchant.id} name={top.merchant.name} size={48} />
                      <span className="rounded-full bg-[#30D158]/15 px-2.5 py-1 text-[13px] font-semibold text-[#30D158]">Top stack today</span>
                    </div>
                    <div className="pt-4 text-[22px] font-bold">{top.merchant.name}</div>
                    <div className={`text-[15px] ${muted}`}>
                      {top.coupon ? `${top.coupon.coupon.code} + ` : ''}
                      {top.winner_card_name ?? 'No card accepted'} · typical {money(top.example_subtotal_cents)} order
                    </div>
                    <div className="flex items-baseline gap-2 pt-4">
                      <span className="font-[family-name:var(--font-sf-rounded)] text-[40px] font-bold leading-none text-[#30D158]">{money(top.total_value_cents)}</span>
                      <span className={`text-[17px] ${muted}`}>back · {Math.round(top.total_value_pct)}%</span>
                    </div>
                  </button>
                </div>
              ) : (
                <p className={`px-5 text-[15px] ${muted}`}>No deals in this category today.</p>
              )}
              {rest.length ? (
                <Section>
                  {rest.map((d, i) => (
                    <Row
                      key={d.merchant.id}
                      leading={<MerchantMark id={d.merchant.id} name={d.merchant.name} />}
                      title={d.merchant.name}
                      subtitle={`${d.coupon ? `${d.coupon.coupon.code} + ` : ''}${d.winner_card_name ?? 'No card accepted'}`}
                      trailing={
                        <div className="tabular-nums">
                          <div className="text-[17px] text-[#30D158]">{money(d.total_value_cents)}</div>
                          <div className={`text-[13px] ${muted}`}>{Math.round(d.total_value_pct)}% back</div>
                        </div>
                      }
                      chevron
                      onClick={() => setOpen(d)}
                      last={i === rest.length - 1}
                    />
                  ))}
                </Section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      <DealSheet
        deal={open}
        session={session}
        onClose={() => setOpen(null)}
        onScan={(d) => {
          setOpen(null)
          openScan({ merchantId: d.merchant.id, subtotalCents: d.example_subtotal_cents })
        }}
      />
    </div>
  )
}

function DealSheet({ deal, session, onClose, onScan }: { deal: Deal | null; session: Session; onClose: () => void; onScan: (d: Deal) => void }) {
  // Keep the last deal on screen while the sheet slides away.
  const [last, setLast] = useState<Deal | null>(deal)
  if (deal && deal !== last) setLast(deal)
  const d = deal ?? last
  if (!d) return null
  const card = d.winner_card_id ? (session.cards.find((c) => c.id === d.winner_card_id) ?? null) : null
  const charge = d.example_subtotal_cents - (d.coupon?.savings_cents ?? 0)
  return (
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()} title={`${d.merchant.name} stack`} panelClassName="n-sheet rounded-t-[28px] text-white" handleClassName="bg-white/30" hideTitle>
      <div className="flex flex-col items-center pb-5 pt-3 text-center">
        <MerchantMark id={d.merchant.id} name={d.merchant.name} size={56} />
        <div className="pt-3 text-[22px] font-bold">{d.merchant.name}</div>
        <div className="font-[family-name:var(--font-sf-rounded)] text-[44px] font-bold leading-[52px] text-[#30D158]">{money(d.total_value_cents)}</div>
        <div className={`text-[15px] ${muted}`}>back on a typical {money(d.example_subtotal_cents)} order</div>
      </div>
      <div className="overflow-hidden n-well rounded-[16px]">
        {d.coupon ? (
          <Row
            leading={<Emoji name="ticket" size={36} />}
            title={<span className="font-mono font-semibold">{d.coupon.coupon.code}</span>}
            subtitle={d.coupon.coupon.description}
            trailing={<span className="tabular-nums text-[#30D158]">−{money(d.coupon.savings_cents)}</span>}
            last={!d.winner_card_name}
          />
        ) : (
          <Row title="No coupon today" subtitle="The card does all the work" last={!d.winner_card_name} />
        )}
        {d.winner_card_name ? (
          <Row
            leading={
              card ? (
                <span className="block h-[26px] w-9">
                  <CardFace card={card} compact />
                </span>
              ) : undefined
            }
            title={d.winner_card_name}
            subtitle={`${d.card_yield_pct}% back on ${money(charge)}`}
            trailing={<span className="tabular-nums text-[#30D158]">+{money(d.rewards_value_cents)}</span>}
            last
          />
        ) : null}
      </div>
      <button type="button" onClick={() => onScan(d)} className="mt-5 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black transition-transform duration-150 active:scale-[0.98]">
        Open in Scan
      </button>
    </Sheet>
  )
}
