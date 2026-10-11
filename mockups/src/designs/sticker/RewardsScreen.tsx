import { motion } from 'motion/react'
import { FireIcon } from '@phosphor-icons/react'
import { cardById, missed } from '../../data/data'
import { topFix } from '../../shared/derive'
import { money, relativeDay, shortDate } from '../../shared/format'
import { Count, Money } from '../../shared/Money'
import type { DemoSession } from '../../shared/session'
import { Box, CardArt, CARD_RATIO, FONT, Label, MerchantMark, Row, Stamp, Title } from './ui'

const HATCH = 'repeating-linear-gradient(135deg, rgba(17,17,17,0.55) 0 2px, transparent 2px 6px)'

export function RewardsScreen({ session }: { session: DemoSession }) {
  const { stats } = session
  const fix = topFix()
  const captured = Math.round(stats.captureRate * 100)

  return (
    <div className="space-y-7 pb-36">
      <Title>Rewards</Title>

      <section className="px-4">
        <div className="text-[13px] font-extrabold uppercase tracking-[0.12em]">Rewards captured · {missed.window_label.toLowerCase()}</div>
        <div className="flex items-end gap-3">
          <span className={`${FONT} text-[128px] font-extrabold leading-[0.82] tracking-[-0.06em] tabular-nums [font-stretch:75%]`}>
            <Count value={captured} suffix="%" />
          </span>
          <span className="pb-2 text-[15px] font-bold leading-[19px]">
            of {money(stats.bestCents)}
            <br />
            you could have earned
          </span>
        </div>
        <div
          className="relative mt-4 h-8 overflow-hidden rounded-[10px] border-2 border-[#111] bg-[#FBF8F1]"
          role="img"
          aria-label={`${captured}% of possible rewards captured`}
        >
          <div className="absolute inset-0" style={{ backgroundImage: HATCH, opacity: 0.35 }} />
          <motion.div
            className="absolute inset-y-0 left-0 w-full origin-left border-r-2 border-[#111] bg-[#0E7A45]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: stats.captureRate }}
            transition={{ type: 'spring', duration: 1, bounce: 0, delay: 0.1 }}
          />
        </div>
        <div className="flex justify-between pt-2.5 text-[15px] font-bold">
          <span>
            <span className="text-[#0E7A45]">
              <Money cents={stats.earnedCents} />
            </span>{' '}
            earned
          </span>
          <span>
            <Money cents={stats.missedCents} /> left on the table
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 px-4">
        <Box raised className="p-3.5">
          <span className="grid size-9 place-items-center rounded-[9px] border-2 border-[#111] bg-[#FF5B1F]">
            <FireIcon size={18} weight="fill" />
          </span>
          <div className={`${FONT} pt-3 text-[44px] font-extrabold leading-none tracking-[-0.04em] tabular-nums`}>
            <Count value={stats.streak} />
          </div>
          <div className="pt-1 text-[14px] font-bold leading-[18px]">best-card picks in a row</div>
          <div className="pt-1 text-[13px] font-semibold text-[#4A4741]">Longest run: {stats.bestStreak}</div>
        </Box>
        <Box raised className="p-3.5">
          <div className="flex h-9 items-center">
            <Stamp kind="maxed" size="sm" still />
          </div>
          <div className={`${FONT} pt-3 text-[44px] font-extrabold leading-none tracking-[-0.04em] tabular-nums`}>
            <Count value={stats.maximized} />
          </div>
          <div className="pt-1 text-[14px] font-bold leading-[18px]">purchases maxed</div>
          <div className="pt-1 text-[13px] font-semibold text-[#4A4741]">of {stats.count} logged</div>
        </Box>
      </section>

      {fix ? (
        <section className="px-4">
          <Box raised>
            <div className="border-b-2 border-[#111] bg-[#FF5B1F] px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.14em]">Your biggest fix</div>
            <div className="flex items-center gap-4 p-4">
              <span className="block w-[44px] shrink-0 shadow-[2px_2px_0_#111]" style={{ height: 44 * CARD_RATIO, borderRadius: 4 }}>
                <CardArt card={fix.card} width={44} />
              </span>
              <div className="min-w-0">
                <div className={`${FONT} text-[22px] font-extrabold leading-[1.05] tracking-[-0.02em]`}>
                  Use {fix.card.name} for {fix.noun}
                </div>
                <div className="pt-1.5 text-[14px] font-semibold text-[#4A4741]">
                  {fix.rateLabel} · {money(fix.missedCents)} missed there in 30 days
                </div>
              </div>
            </div>
          </Box>
        </section>
      ) : null}

      <section className="px-4">
        <Label>Last 30 days</Label>
        <Box className="px-3.5 pb-3 pt-4">
          <DailyChart />
        </Box>
      </section>

      <section className="px-4">
        <Label>Purchases</Label>
        <Box>
          {session.history.slice(0, 20).map((t, i) => {
            const maxed = t.missed_cents === 0
            const used = cardById[t.card_used_id]?.name ?? 'Card'
            const best = t.best_card_id ? cardById[t.best_card_id]?.name : null
            return (
              <Row
                key={t.id}
                first={i === 0}
                leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} />}
                title={t.merchant_name}
                subtitle={maxed ? `${relativeDay(t.ts)} · ${used}` : `Used ${used} · best ${best}`}
                trailing={
                  maxed ? (
                    <div className="flex flex-col items-end gap-1">
                      <Stamp kind="maxed" size="sm" still />
                      <span className="text-[13px] font-bold tabular-nums text-[#0E7A45]">+{money(t.earned_cents)}</span>
                    </div>
                  ) : (
                    <div className="tabular-nums">
                      <div className="text-[16px] font-extrabold">{money(t.missed_cents)}</div>
                      <div className="text-[13px] font-bold text-[#4A4741]">missed</div>
                    </div>
                  )
                }
              />
            )
          })}
        </Box>
        <p className="px-1 pt-3 text-[13px] font-semibold text-[#4A4741]">Simulated purchases and estimated rewards. Points valued at each card's typical rate.</p>
      </section>
    </div>
  )
}

function DailyChart() {
  const days = missed.daily
  const max = Math.max(...days.map((d) => d.earned_cents + d.missed_cents), 1)
  const H = 128
  return (
    <div>
      <div
        className="flex items-end gap-[3px] border-b-2 border-[#111]"
        style={{ height: H }}
        role="img"
        aria-label={`Daily rewards, ${missed.window_label.toLowerCase()}: earned solid green, missed hatched`}
      >
        {days.map((d, i) => {
          const total = d.earned_cents + d.missed_cents
          const h = total ? Math.max(5, (total / max) * (H - 6)) : 0
          const earnedH = total ? (d.earned_cents / total) * h : 0
          return (
            <motion.div
              key={d.date}
              className="flex flex-1 origin-bottom flex-col justify-end overflow-hidden rounded-t-[3px]"
              style={{ height: h }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0, delay: i * 0.012 }}
              title={`${shortDate(d.date)}: ${money(d.earned_cents)} earned, ${money(d.missed_cents)} missed`}
            >
              <div className="flex-1" style={{ backgroundImage: HATCH }} />
              {earnedH ? <div className="bg-[#0E7A45]" style={{ height: earnedH }} /> : null}
            </motion.div>
          )
        })}
      </div>
      <div className="flex items-center justify-between pt-2 text-[12px] font-bold">
        <span>{shortDate(days[0].date)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] border-2 border-[#111] bg-[#0E7A45]" /> Earned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] border-2 border-[#111]" style={{ backgroundImage: HATCH }} /> Missed
          </span>
        </span>
        <span>Today</span>
      </div>
    </div>
  )
}
