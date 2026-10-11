import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckIcon } from '@phosphor-icons/react'
import { cardById, missed } from '../../data/data'
import { topFix } from '../../shared/derive'
import { money, relativeDay, shortDate } from '../../shared/format'
import { Count, Money } from '../../shared/Money'
import type { DemoSession } from '../../shared/session'
import { CardArt, Masthead, MerchantMark, Tally, focusRing, hairline, muted, serif } from './ui'

export function RewardsScreen({ session }: { session: DemoSession }) {
  const { stats } = session
  const fix = topFix()
  const pctCaptured = Math.round(stats.captureRate * 100)
  const [all, setAll] = useState(false)
  const purchases = session.history.slice(0, all ? 40 : 8)

  return (
    <div className="pb-28">
      <Masthead title="Rewards" kicker={`Scorecard · ${missed.window_label.toLowerCase()}`} />

      <section className="px-5 pt-3" aria-label="Capture rate">
        <p className={`${serif} text-[128px] leading-[112px] tracking-[-4px]`}>
          <Count value={pctCaptured} suffix="%" />
        </p>
        <p className="pt-2 text-[16px]">of the rewards on offer, captured</p>
        <div className="relative mt-4 h-[3px] bg-[#141414]/10" role="progressbar" aria-valuenow={pctCaptured} aria-valuemin={0} aria-valuemax={100} aria-label="Rewards captured">
          <motion.div
            className="absolute inset-0 origin-left bg-[#0F7B4A]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: stats.captureRate }}
            transition={{ type: 'spring', duration: 1.1, bounce: 0, delay: 0.1 }}
          />
          {[25, 50, 75].map((t) => (
            <span key={t} aria-hidden className="absolute -top-1 h-[11px] w-px bg-[#141414]/30" style={{ left: `${t}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 pt-5">
          <div className="pr-4">
            <p className={`text-[14px] ${muted}`}>Earned</p>
            <p className="text-[26px] font-semibold tabular-nums tracking-[-0.4px] text-[#0F7B4A]">
              <Money cents={stats.earnedCents} />
            </p>
          </div>
          <div className="border-l-[0.5px] border-[rgba(20,20,20,0.2)] pl-4">
            <p className={`text-[14px] ${muted}`}>Left on the table</p>
            <p className="text-[26px] font-semibold tabular-nums tracking-[-0.4px]">
              <Money cents={stats.missedCents} />
            </p>
          </div>
        </div>
        <p className={`pt-1 text-[14px] ${muted}`}>Across {stats.count} simulated purchases</p>
      </section>

      <dl className="mx-5 mt-7 border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        <div className={`flex min-h-[56px] items-center justify-between gap-4 py-3 ${hairline}`}>
          <dt>
            <span className="block text-[16px] font-medium">Best-card streak</span>
            <span className={`block text-[14px] ${muted}`}>{stats.streak ? 'Keep paying with the card we pick' : 'Pay with the best card to start one'}</span>
          </dt>
          <dd className="flex items-center gap-3">
            <Tally count={stats.streak} />
            <span className="text-[18px] font-semibold tabular-nums">{stats.streak}</span>
          </dd>
        </div>
        <div className={`flex min-h-[52px] items-center justify-between py-3 ${hairline}`}>
          <dt className="text-[16px] font-medium">Longest streak</dt>
          <dd className="text-[16px] tabular-nums">{stats.bestStreak}</dd>
        </div>
        <div className={`flex min-h-[52px] items-center justify-between py-3 ${hairline}`}>
          <dt className="text-[16px] font-medium">Maximized purchases</dt>
          <dd className="flex items-center gap-1.5 text-[16px] tabular-nums">
            <CheckIcon size={16} weight="bold" className="text-[#0F7B4A]" />
            {stats.maximized} of {stats.count}
          </dd>
        </div>
      </dl>

      {fix ? (
        <section className="mx-5 pt-9" aria-label="Your biggest fix">
          <p className="text-[13px] font-semibold uppercase tracking-[1.2px]">The one fix</p>
          <div className="flex items-start gap-4 pt-3">
            <p className={`${serif} flex-1 text-[34px] leading-[38px] tracking-[-0.4px]`}>
              Use {fix.card.name} for <em className="italic">{fix.noun}</em>.
            </p>
            <span className="mt-1.5 block h-[36px] w-[56px] shrink-0 rounded-[5px] shadow-[0_1px_2px_rgba(20,20,20,0.18),0_6px_14px_-6px_rgba(20,20,20,0.3)]">
              <CardArt card={fix.card} size="mini" />
            </span>
          </div>
          <p className={`pt-2 text-[15px] ${muted}`}>
            {fix.rateLabel} · {money(fix.missedCents)} missed there in 30 days
          </p>
        </section>
      ) : null}

      <section className="mx-5 pt-10" aria-label="Last 30 days">
        <div className={`flex items-baseline justify-between pb-2 ${hairline}`}>
          <p className="text-[13px] font-semibold uppercase tracking-[1.2px]">Last 30 days</p>
          <p className="flex items-center gap-3 text-[13px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-[3px] rounded-full bg-[#0F7B4A]" /> Earned
            </span>
            <span className={`flex items-center gap-1.5 ${muted}`}>
              <span className="h-2 w-[3px] rounded-full bg-[#141414]/25" /> Missed
            </span>
          </p>
        </div>
        <DailyBars />
      </section>

      <section className="mx-5 pt-10" aria-label="Purchases">
        <p className={`pb-2 text-[13px] font-semibold uppercase tracking-[1.2px] ${hairline}`}>Purchases</p>
        <ul>
          {purchases.map((t) => {
            const maxed = t.missed_cents === 0
            const used = cardById[t.card_used_id]?.name ?? 'Card'
            const best = t.best_card_id ? cardById[t.best_card_id]?.name : null
            return (
              <li key={t.id} className={`flex items-center gap-3 py-3 ${hairline}`}>
                <MerchantMark id={t.merchant_id} name={t.merchant_name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px]">{t.merchant_name}</span>
                  <span className={`block truncate text-[14px] ${muted}`}>{maxed ? `${relativeDay(t.ts)} · ${used}` : `${used}, not ${best}`}</span>
                </span>
                {maxed ? (
                  <span className="flex items-center gap-1 text-[15px] tabular-nums text-[#0F7B4A]">
                    <CheckIcon size={14} weight="bold" />+{money(t.earned_cents)}
                  </span>
                ) : (
                  <span className="text-right tabular-nums">
                    <span className="block text-[16px]">{money(t.missed_cents)}</span>
                    <span className={`block text-[13px] ${muted}`}>missed</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
        {session.history.length > 8 ? (
          <button
            type="button"
            onClick={() => setAll((a) => !a)}
            className={`mt-2 h-11 text-[15px] font-medium underline decoration-[rgba(20,20,20,0.35)] underline-offset-4 ${focusRing}`}
          >
            {all ? 'Show fewer' : `Show all ${session.history.length}`}
          </button>
        ) : null}
        <p className={`pt-4 text-[14px] ${muted}`}>Simulated purchases and estimated rewards. Points are valued at each card's typical rate.</p>
      </section>
    </div>
  )
}

function DailyBars() {
  const days = missed.daily
  const max = Math.max(...days.map((d) => d.earned_cents + d.missed_cents), 1)
  const H = 96
  return (
    <div className="pt-4">
      <div className="flex h-[96px] items-end justify-between" role="img" aria-label={`Daily rewards for the ${missed.window_label.toLowerCase()}: earned in green, missed in grey`}>
        {days.map((d, i) => {
          const total = d.earned_cents + d.missed_cents
          const h = total ? Math.max(6, (total / max) * H) : 2
          const earnedH = total ? (d.earned_cents / total) * h : 0
          return (
            <motion.div
              key={d.date}
              className="flex w-[4px] origin-bottom flex-col justify-end overflow-hidden rounded-full"
              style={{ height: h, background: total ? 'rgba(20,20,20,0.22)' : 'rgba(20,20,20,0.1)' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0, delay: i * 0.012 }}
              title={`${shortDate(d.date)}: ${money(d.earned_cents)} earned, ${money(d.missed_cents)} missed`}
            >
              {earnedH ? <div className="w-full shrink-0 bg-[#0F7B4A]" style={{ height: earnedH }} /> : null}
            </motion.div>
          )
        })}
      </div>
      <div className={`flex justify-between pt-2 text-[13px] ${muted}`}>
        <span>{shortDate(days[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
