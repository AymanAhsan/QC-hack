import { motion } from 'motion/react'
import { CheckIcon, FireIcon, LightningIcon } from '@phosphor-icons/react'
import { cardById, missed, type Transaction } from '../../data/data'
import { topFix } from '../../shared/derive'
import { DEMO_NOW, money, relativeDay, shortDate } from '../../shared/format'
import { Count, Money } from '../../shared/Money'
import type { DemoSession } from '../../shared/session'
import { Hud } from './Hud'
import { A, CardArt, MerchantMark, Ring, Row, SectionTitle, Tile, cardEdge, shortCard } from './ui'

/** Skill tiers by capture rate: a level for good decisions, never for spending. */
const TIERS = [
  { name: 'Rookie', from: 0 },
  { name: 'Pro', from: 25 },
  { name: 'Ace', from: 50 },
  { name: 'Max', from: 75 },
]

export function RewardsScreen({ session }: { session: DemoSession }) {
  const { stats } = session
  const pctCaptured = Math.round(stats.captureRate * 100)
  const tierIndex = TIERS.reduce((at, t, i) => (pctCaptured >= t.from ? i : at), 0)
  const tier = TIERS[tierIndex]
  const next = TIERS[tierIndex + 1]
  const fix = topFix()

  return (
    <div className="space-y-6 pb-36">
      <Hud session={session} title="Rewards" />

      <div className="px-4">
        <Tile className="flex items-center gap-5 p-5">
          <Ring value={stats.captureRate} size={132} stroke={16}>
            <span className="block text-center">
              <span className="block text-[36px] font-black leading-none tabular-nums">
                <Count value={pctCaptured} suffix="%" />
              </span>
              <span className="block pt-1 text-[12px] font-extrabold uppercase tracking-[1px] text-[#6B6257]">captured</span>
            </span>
          </Ring>
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold uppercase tracking-[1px] text-[#6B6257]">Your level</div>
            <div className="text-[34px] font-black leading-tight tracking-[-0.5px]">{tier.name}</div>
            {next ? (
              <div className="pt-1 text-[14px] font-bold leading-[19px] text-[#6B6257]">
                {next.name} at {next.from}% of rewards captured
              </div>
            ) : (
              <div className="pt-1 text-[14px] font-bold text-[#6B6257]">Top level. Keep it up.</div>
            )}
          </div>
        </Tile>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        <Tile className="p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[1px] text-[#6B6257]">Earned</div>
          <div className="pt-1 text-[26px] font-black tracking-[-0.4px] text-[#0B7D4D]">
            <Money cents={stats.earnedCents} />
          </div>
        </Tile>
        <Tile className="p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[1px] text-[#6B6257]">Left on table</div>
          <div className="pt-1 text-[26px] font-black tracking-[-0.4px]">
            <Money cents={stats.missedCents} />
          </div>
        </Tile>
      </div>

      <div className="px-4">
        <Tile className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-[16px] bg-[#FFEBD3]">
              <FireIcon size={28} weight="fill" style={{ color: stats.streak ? A.flame : '#E0C9A8' }} />
            </span>
            <div className="flex-1">
              <div className="text-[20px] font-black leading-tight">
                <Count value={stats.streak} /> best-card {stats.streak === 1 ? 'pick' : 'picks'} in a row
              </div>
              <div className="text-[14px] font-bold text-[#6B6257]">
                {stats.maximized} of {stats.count} purchases maximized · longest run {stats.bestStreak}
              </div>
            </div>
          </div>
          <WeekDots history={session.history} />
        </Tile>
      </div>

      {fix ? (
        <div className="px-4">
          <SectionTitle>Biggest fix</SectionTitle>
          <Tile face="#1F1F1F" edge="#000000" className="flex items-center gap-4 p-4 text-white">
            <span className="block h-[46px] w-[72px] shrink-0 overflow-hidden rounded-[10px]" style={{ boxShadow: `0 4px 0 ${cardEdge(fix.card)}` }}>
              <CardArt card={fix.card} bare />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-black leading-tight">
                Use {fix.card.name} for {fix.noun}
              </div>
              <div className="pt-0.5 text-[14px] font-bold text-white/70">
                {fix.rateLabel} · {money(fix.missedCents)} missed there in 30 days
              </div>
            </div>
            <LightningIcon size={22} weight="fill" className="shrink-0 text-[#1FCB82]" />
          </Tile>
        </div>
      ) : null}

      <div className="px-4">
        <SectionTitle>Last 30 days</SectionTitle>
        <Tile className="px-4 pb-4 pt-5">
          <Chart />
        </Tile>
      </div>

      <div className="px-4">
        <SectionTitle>Purchases</SectionTitle>
        <Tile>
          {session.history.slice(0, 20).map((t, i, all) => {
            const maxed = t.missed_cents === 0
            const used = cardById[t.card_used_id]?.name ?? 'Card'
            const best = t.best_card_id ? cardById[t.best_card_id]?.name : null
            return (
              <Row
                key={t.id}
                leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} />}
                title={t.merchant_name}
                subtitle={maxed ? `${relativeDay(t.ts)} · ${used}` : `Used ${shortCard(used)} · best ${best ? shortCard(best) : '—'}`}
                trailing={
                  maxed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E3F7EC] px-2.5 py-1 text-[14px] font-black tabular-nums text-[#0B7D4D]">
                      <CheckIcon size={14} weight="bold" />+{money(t.earned_cents)}
                    </span>
                  ) : (
                    <div className="tabular-nums">
                      <div className="text-[17px] font-black">{money(t.missed_cents)}</div>
                      <div className="text-[12px] font-extrabold text-[#8A8075]">missed</div>
                    </div>
                  )
                }
                last={i === all.length - 1}
              />
            )
          })}
        </Tile>
      </div>
      <p className="px-8 text-center text-[13px] font-bold text-[#8A8075]">Simulated purchases and estimated rewards. Points valued at each card's typical rate.</p>
    </div>
  )
}

/** The last seven days: checked when you made at least one best-card pick that day. */
function WeekDots({ history }: { history: Transaction[] }) {
  const today = Date.parse(DEMO_NOW.slice(0, 10))
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today - (6 - i) * 86_400_000).toISOString().slice(0, 10)
    const txs = history.filter((t) => t.ts.slice(0, 10) === date)
    const state = !txs.length ? 'none' : txs.some((t) => t.missed_cents === 0) ? 'maxed' : 'missed'
    return { date, state, label: new Date(date).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' }) }
  })
  return (
    <ol className="mt-5 flex justify-between" aria-label="Last seven days">
      {days.map((d, i) => (
        <li key={d.date} className="flex flex-col items-center gap-1.5" aria-label={`${shortDate(d.date)}: ${d.state === 'maxed' ? 'best-card pick made' : d.state === 'missed' ? 'rewards missed' : 'no purchases'}`}>
          <motion.span
            className={`grid size-9 place-items-center rounded-full ${
              d.state === 'maxed' ? 'bg-[#1FCB82] shadow-[0_3px_0_#12935C]' : d.state === 'missed' ? 'bg-[#EFE3D0] shadow-[0_3px_0_#E0D2BD]' : 'border-2 border-dashed border-[#E6D7C0]'
            }`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.4, delay: 0.05 * i }}
          >
            {d.state === 'maxed' ? <CheckIcon size={16} weight="bold" /> : d.state === 'missed' ? <span className="h-[3px] w-3 rounded-full bg-[#BFAE95]" /> : null}
          </motion.span>
          <span className={`text-[12px] font-black ${i === 6 ? 'text-[#1F1F1F]' : 'text-[#A79C8E]'}`}>{i === 6 ? 'Today' : d.label}</span>
        </li>
      ))}
    </ol>
  )
}

function Chart() {
  const days = missed.daily
  const max = Math.max(...days.map((d) => d.earned_cents + d.missed_cents), 1)
  const H = 120
  return (
    <div>
      <div className="flex h-[120px] items-end gap-[3px]" role="img" aria-label={`Daily rewards, ${missed.window_label.toLowerCase()}: earned in green, missed in tan`}>
        {days.map((d, i) => {
          const total = d.earned_cents + d.missed_cents
          const h = total ? Math.max(8, (total / max) * H) : 5
          const share = total ? d.earned_cents / total : 0
          return (
            <motion.div
              key={d.date}
              className="flex flex-1 origin-bottom flex-col-reverse overflow-hidden rounded-full"
              style={{ height: h, background: total ? '#E6D7C0' : '#F4EADB' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0.25, delay: i * 0.012 }}
              title={`${shortDate(d.date)}: ${money(d.earned_cents)} earned, ${money(d.missed_cents)} missed`}
            >
              <div style={{ height: `${share * 100}%`, background: A.jade }} />
            </motion.div>
          )
        })}
      </div>
      <div className="flex justify-between pt-3 text-[13px] font-extrabold text-[#6B6257]">
        <span>{shortDate(days[0].date)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#1FCB82]" /> Earned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#E6D7C0]" /> Missed
          </span>
        </span>
        <span>Today</span>
      </div>
    </div>
  )
}
