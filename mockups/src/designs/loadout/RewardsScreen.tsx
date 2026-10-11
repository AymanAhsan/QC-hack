import { motion } from 'motion/react'
import { CheckIcon, FireIcon } from '@phosphor-icons/react'
import { cardById, missed } from '../../data/data'
import { topFix } from '../../shared/derive'
import { money, relativeDay, shortDate } from '../../shared/format'
import { Count, Money } from '../../shared/Money'
import type { DemoSession } from '../../shared/session'
import { CardArt, Label, MerchantMark, Panel, Row, ScreenHeader } from './ui'

const SEGMENTS = 20

export function RewardsScreen({ session }: { session: DemoSession }) {
  const { stats } = session
  const fix = topFix()
  const pctCaptured = Math.round(stats.captureRate * 100)
  const filled = Math.round(stats.captureRate * SEGMENTS)
  const cats = missed.by_category.slice(0, 6)
  const catMax = Math.max(...cats.map((c) => c.missed_cents), 1)

  return (
    <div className="space-y-8 pb-32">
      <ScreenHeader kicker={`Season · ${missed.window_label.toLowerCase()}`} title="Rewards" />

      <section className="px-5">
        <Label>Rewards captured</Label>
        <div className="flex items-end justify-between gap-4">
          <div className="font-mono text-[64px] font-medium leading-[72px] tracking-[-0.03em] tabular-nums">
            <Count value={pctCaptured} suffix="%" />
          </div>
          <div className="pb-3 text-right font-mono text-[13px] tabular-nums text-[#9BA3B1]">
            {stats.count} purchases
          </div>
        </div>
        <div className="mt-2 flex gap-[3px]" role="img" aria-label={`${pctCaptured}% of possible rewards captured`}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <motion.span
              key={i}
              className="h-3 flex-1 rounded-[2px]"
              style={{ background: i < filled ? '#9BE36D' : 'rgba(255,255,255,0.08)' }}
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.2, delay: 0.05 + i * 0.025 }}
            />
          ))}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <dt>
              <Label>Earned</Label>
            </dt>
            <dd className="pt-0.5 font-mono text-[22px] tabular-nums text-[#9BE36D]">
              <Money cents={stats.earnedCents} />
            </dd>
          </div>
          <div>
            <dt>
              <Label>Left on the table</Label>
            </dt>
            <dd className="pt-0.5 font-mono text-[22px] tabular-nums">
              <Money cents={stats.missedCents} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="px-5">
        <Panel className="grid grid-cols-3">
          <Stat label="Streak" value={stats.streak} icon={<FireIcon size={16} weight="fill" />} />
          <Stat label="Best run" value={stats.bestStreak} divider />
          <Stat label="Maximized" value={stats.maximized} of={stats.count} divider />
        </Panel>
        <p className="pt-2 text-[13px] text-[#9BA3B1]">{stats.streak ? 'Streaks count purchases, not days. Miss one and the next best-card pick starts a new run.' : 'Pay with the recommended card to start a streak. It counts purchases, not days.'}</p>
      </section>

      {fix ? (
        <section className="px-5">
          <Label>Next upgrade</Label>
          <Panel className="mt-2 flex items-center gap-4 p-4">
            <span className="block h-[44px] w-[70px] shrink-0">
              <CardArt card={fix.card} mini />
            </span>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold leading-[21px]">
                Use {fix.card.name} for {fix.noun}
              </div>
              <div className="text-[13px] text-[#9BA3B1]">
                {fix.rateLabel} · <span className="font-mono tabular-nums">{money(fix.missedCents)}</span> missed there in 30 days
              </div>
            </div>
          </Panel>
        </section>
      ) : null}

      <section className="px-5">
        <Label>Where it slipped</Label>
        <ul className="mt-3 space-y-3">
          {cats.map((c, i) => (
            <li key={c.category} className="flex items-center gap-3">
              <span className="w-[104px] shrink-0 truncate text-[13px] text-[#EEF0F4]">{c.category_label}</span>
              <div className="h-[8px] flex-1 overflow-hidden rounded-[2px] bg-white/[0.06]">
                <motion.div
                  className="h-full origin-left rounded-[2px] bg-[#EEF0F4]/55"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: c.missed_cents / catMax }}
                  transition={{ type: 'spring', duration: 0.6, bounce: 0, delay: i * 0.04 }}
                />
              </div>
              <span className="w-[56px] shrink-0 text-right font-mono text-[13px] tabular-nums text-[#9BA3B1]">{money(c.missed_cents)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5">
        <div className="flex items-center justify-between">
          <Label>Daily</Label>
          <span className="flex items-center gap-3 font-mono text-[11px] text-[#9BA3B1]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-[#9BE36D]" /> Earned
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-white/25" /> Missed
            </span>
          </span>
        </div>
        <DailyChart />
      </section>

      <section className="px-5">
        <Label>Purchases</Label>
        <Panel className="mt-2">
          {session.history.slice(0, 20).map((t, i, all) => {
            const maxed = t.missed_cents === 0
            const used = cardById[t.card_used_id]?.name ?? 'Card'
            const best = t.best_card_id ? cardById[t.best_card_id]?.name : null
            return (
              <Row
                key={t.id}
                leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} size={34} />}
                title={t.merchant_name}
                subtitle={maxed ? `${relativeDay(t.ts)} · ${used}` : `${used} · best was ${best}`}
                trailing={
                  maxed ? (
                    <span className="flex items-center gap-1 font-mono text-[14px] tabular-nums text-[#9BE36D]">
                      <CheckIcon size={14} weight="bold" />+{money(t.earned_cents)}
                    </span>
                  ) : (
                    <div className="font-mono tabular-nums">
                      <div className="text-[15px]">{money(t.missed_cents)}</div>
                      <div className="text-[12px] text-[#9BA3B1]">missed</div>
                    </div>
                  )
                }
                last={i === all.length - 1}
              />
            )
          })}
        </Panel>
        <p className="pt-3 text-center text-[12px] text-[#9BA3B1]">Simulated purchases and estimated rewards.</p>
      </section>
    </div>
  )
}

function Stat({ label, value, of, icon, divider = false }: { label: string; value: number; of?: number; icon?: React.ReactNode; divider?: boolean }) {
  return (
    <div className={`px-4 py-3.5 ${divider ? 'shadow-[inset_1px_0_0_rgba(255,255,255,0.06)]' : ''}`}>
      <Label>{label}</Label>
      <div className="flex items-center gap-1.5 pt-1 font-mono text-[22px] tabular-nums">
        {icon ? <span className={value ? 'text-[#EEF0F4]' : 'text-[#5E6676]'}>{icon}</span> : null}
        <span>
          <Count value={value} />
          {of ? <span className="text-[14px] text-[#9BA3B1]">/{of}</span> : null}
        </span>
      </div>
    </div>
  )
}

function DailyChart() {
  const days = missed.daily
  const max = Math.max(...days.map((d) => d.earned_cents + d.missed_cents), 1)
  const H = 110
  return (
    <div className="pt-3">
      <div className="flex h-[110px] items-end gap-[3px]" role="img" aria-label={`Daily rewards for the ${missed.window_label.toLowerCase()}: earned and missed`}>
        {days.map((d, i) => {
          const total = d.earned_cents + d.missed_cents
          const h = total ? Math.max(4, (total / max) * H) : 2
          const earnedShare = total ? d.earned_cents / total : 0
          return (
            <motion.div
              key={d.date}
              className="flex flex-1 origin-bottom flex-col-reverse overflow-hidden rounded-[2px]"
              style={{ height: h, background: total ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0, delay: i * 0.012 }}
              title={`${shortDate(d.date)}: ${money(d.earned_cents)} earned, ${money(d.missed_cents)} missed`}
            >
              <div className="bg-[#9BE36D]" style={{ height: `${earnedShare * 100}%` }} />
            </motion.div>
          )
        })}
      </div>
      <div className="flex justify-between pt-2 font-mono text-[11px] text-[#9BA3B1]">
        <span>{shortDate(days[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
