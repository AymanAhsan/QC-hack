// What an opened card earns where you are, as two tiles under the card, the way
// Apple Card shows Total Balance and Payment Due in Wallet: small label, big number, muted line.
// Left: this store. Right: the card to use instead, or, when this one is the best (or
// there's no store), what it earned you over the last 30 days.

import { CaretRightIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { Card } from '../../data/data'
import { rateShort, standing } from '../../shared/derive'
import { money } from '../../shared/format'
import type { DemoSession } from '../../shared/session'

const muted = 'text-[rgba(235,235,245,0.6)]'
const rounded = 'font-[family-name:var(--font-sf-rounded)]'

/** Everything the tiles show, worked out once. */
function useHere(session: DemoSession, card: Card) {
  const st = standing(session.rec, session.evaluation(card.id))
  const bestCard = session.cards.find((c) => c.id === session.winnerCardId) ?? null
  const bestEv = bestCard ? session.evaluation(bestCard.id) : null
  return {
    st,
    store: session.store?.merchant ?? null,
    bestCard,
    bestValue: bestEv?.value_cents ?? 0,
    bestShort: bestEv ? rateShort(bestEv) : '',
  }
}

/** What this card has earned you over the month of history. */
function useMonth(session: DemoSession, card: Card) {
  const txs = session.historyFor(card.id)
  return { count: txs.length, earned: txs.reduce((sum, t) => sum + t.earned_cents, 0) }
}

function Tile({ label, value, sub, onClick }: { label: string; value: React.ReactNode; sub?: React.ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className={`flex items-center justify-between gap-1 text-[13px] ${muted}`}>
        <span className="truncate">{label}</span>
        {onClick ? <CaretRightIcon size={12} weight="bold" className="text-[rgba(235,235,245,0.3)]" /> : null}
      </span>
      <span className={`mt-1 block truncate ${rounded} text-[22px] font-bold leading-[28px]`}>{value}</span>
      {sub ? <span className={`block truncate text-[13px] ${muted}`}>{sub}</span> : null}
    </>
  )
  const cls = 'n-panel min-w-0 rounded-[20px] px-3.5 py-3 text-left'
  return onClick ? (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.97 }} className={`${cls} focus-visible:outline-2 focus-visible:outline-white/70`}>
      {body}
    </motion.button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function HereTiles({ session, card, onWhy, onPick }: { session: DemoSession; card: Card; onWhy: () => void; onPick: () => void }) {
  const h = useHere(session, card)
  const month = useMonth(session, card)
  const { st } = h
  // The best card doesn't need a tile telling it so (a badge does that); it gets its month instead.
  const monthTile = (
    <Tile
      label="Last 30 days"
      value={month.count ? `+${money(month.earned)}` : 'Nothing yet'}
      sub={month.count ? `${month.count} purchase${month.count === 1 ? '' : 's'}` : `Pay with ${card.name} to start`}
    />
  )
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-6 pt-4">
      {st.kind === 'no-store' ? (
        <Tile label="Where are you?" value="Pick a store" sub="See what it earns" onClick={onPick} />
      ) : st.kind === 'rejected' ? (
        <Tile label={`At ${h.store?.name}`} value="Not accepted" sub={st.reason} />
      ) : (
        <Tile
          label={`At ${h.store?.name}`}
          value={
            st.value > 0 ? (
              <span className="flex items-center gap-2">
                <span className="text-[#30D158]">+{money(st.value)}</span>
                {st.kind === 'best' ? (
                  <span className="rounded-full bg-[#30D158]/15 px-2 py-0.5 font-[family-name:var(--font-sf)] text-[12px] font-semibold leading-[16px] text-[#30D158]">Best</span>
                ) : null}
              </span>
            ) : (
              'No rewards'
            )
          }
          sub={st.value > 0 ? st.short : card.is_default_debit ? 'Debit card' : 'Nothing back here'}
          onClick={st.kind === 'best' ? onWhy : undefined}
        />
      )}
      {st.kind === 'best' || st.kind === 'no-store' ? (
        monthTile
      ) : (
        <Tile label="Best here" value={h.bestCard?.name ?? '—'} sub={`+${money(h.bestValue)} · ${h.bestShort}`} onClick={onWhy} />
      )}
    </div>
  )
}
