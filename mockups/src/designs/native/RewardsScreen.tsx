import { motion } from 'motion/react'
import { CheckCircleIcon } from '@phosphor-icons/react'
import { cardById, missed } from '../../data/data'
import { topFix } from '../../shared/derive'
import { money, relativeDay, shortDate } from '../../shared/format'
import { Count, Money } from '../../shared/Money'
import type { DemoSession } from '../../shared/session'
import { CardFace, Emoji, LargeTitle, MerchantMark, Row, Section } from './ui'

const RING = 168
const STROKE = 18

export function RewardsScreen({ session }: { session: DemoSession }) {
  const { stats } = session
  const fix = topFix()
  const pctCaptured = Math.round(stats.captureRate * 100)
  const r = (RING - STROKE) / 2

  return (
    <div className="space-y-7 pb-32">
      <LargeTitle>Rewards</LargeTitle>

      <div className="flex items-center gap-5 px-5">
        <div className="relative shrink-0" style={{ width: RING, height: RING }}>
          <svg viewBox={`0 0 ${RING} ${RING}`} className="-rotate-90" width={RING} height={RING} aria-hidden>
            <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={STROKE} />
            <motion.circle
              cx={RING / 2}
              cy={RING / 2}
              r={r}
              fill="none"
              stroke="#30D158"
              strokeWidth={STROKE}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: stats.captureRate }}
              transition={{ type: 'spring', duration: 1.2, bounce: 0, delay: 0.15 }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-[family-name:var(--font-sf-rounded)] text-[40px] font-bold leading-none">
                <Count value={pctCaptured} suffix="%" />
              </div>
              <div className="pt-1 text-[13px] text-[rgba(235,235,245,0.6)]">captured</div>
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <div className="text-[13px] text-[rgba(235,235,245,0.6)]">Earned</div>
            <div className="font-[family-name:var(--font-sf-rounded)] text-[24px] font-bold text-[#30D158]">
              <Money cents={stats.earnedCents} />
            </div>
          </div>
          <div>
            <div className="text-[13px] text-[rgba(235,235,245,0.6)]">Saved with codes</div>
            <div className="font-[family-name:var(--font-sf-rounded)] text-[24px] font-bold">
              <Money cents={stats.couponSavedCents} />
            </div>
          </div>
          <div>
            <div className="text-[13px] text-[rgba(235,235,245,0.6)]">Left on the table</div>
            <div className="font-[family-name:var(--font-sf-rounded)] text-[24px] font-bold">
              <Money cents={stats.missedCents} />
            </div>
          </div>
          <div className="text-[13px] text-[rgba(235,235,245,0.6)]">
            {missed.window_label} · {stats.count} purchases
          </div>
        </div>
      </div>

      <Section>
        <Row
          leading={<Emoji name="fire" size={36} />}
          title="Best-card streak"
          subtitle={stats.streak ? 'Keep paying with the card we pick' : 'Pay with the best card to start one'}
          trailing={<span className="font-[family-name:var(--font-sf-rounded)] text-[22px] font-bold"><Count value={stats.streak} /></span>}
        />
        <Row
          leading={<Emoji name="bullseye" size={36} />}
          title="Maximized purchases"
          trailing={
            <span className="tabular-nums text-[rgba(235,235,245,0.6)]">
              {stats.maximized} of {stats.count}
            </span>
          }
          last
        />
      </Section>

      {fix ? (
        <Section title="Your biggest fix">
          <div className="flex items-center gap-4 p-4">
            <span className="block h-[46px] w-[72px] shrink-0">
              <CardFace card={fix.card} compact />
            </span>
            <div className="min-w-0">
              <div className="text-[17px] font-semibold">
                Use {fix.card.name} for {fix.noun}
              </div>
              <div className="text-[15px] text-[rgba(235,235,245,0.6)]">
                {fix.rateLabel} · {money(fix.missedCents)} missed there in 30 days
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Last 30 days">
        <DailyChart />
      </Section>

      <Section title="Purchases">
        {session.history.slice(0, 20).map((t, i, all) => {
          const best = t.best_card_id ? cardById[t.best_card_id] : null
          const maxed = t.missed_cents === 0
          return (
            <Row
              key={t.id}
              leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} />}
              title={t.merchant_name}
              subtitle={maxed ? `${relativeDay(t.ts)} · ${cardById[t.card_used_id]?.name ?? 'Card'}` : `Used ${cardById[t.card_used_id]?.name} · best ${best?.name}`}
              trailing={
                maxed ? (
                  <span className="flex items-center gap-1 text-[15px] text-[#30D158]">
                    <CheckCircleIcon size={16} weight="fill" />+{money(t.earned_cents)}
                  </span>
                ) : (
                  <div className="text-right tabular-nums">
                    <div className="text-[17px]">{money(t.missed_cents)}</div>
                    <div className="text-[13px] text-[rgba(235,235,245,0.6)]">missed</div>
                  </div>
                )
              }
              last={i === all.length - 1}
            />
          )
        })}
      </Section>
      <p className="px-8 text-center text-[13px] text-[rgba(235,235,245,0.6)]">Points valued at each card's typical rate.</p>
    </div>
  )
}

function DailyChart() {
  const days = missed.daily
  const max = Math.max(...days.map((d) => d.earned_cents + d.missed_cents), 1)
  const H = 120
  return (
    <div className="px-4 pb-3 pt-4">
      <div className="flex h-[120px] items-end gap-[3px]" role="img" aria-label={`Daily rewards, ${missed.window_label.toLowerCase()}: earned in green, missed in grey`}>
        {days.map((d, i) => {
          const total = d.earned_cents + d.missed_cents
          const h = total ? Math.max(4, (total / max) * H) : 3
          const earnedShare = total ? d.earned_cents / total : 0
          return (
            <motion.div
              key={d.date}
              className="flex flex-1 origin-bottom flex-col-reverse overflow-hidden rounded-t-[3px] rounded-b-[1px]"
              style={{ height: h, background: total ? 'rgba(235,235,245,0.22)' : 'rgba(235,235,245,0.08)' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0, delay: i * 0.012 }}
              title={`${shortDate(d.date)}: ${money(d.earned_cents)} earned, ${money(d.missed_cents)} missed`}
            >
              <div className="bg-[#30D158]" style={{ height: `${earnedShare * 100}%` }} />
            </motion.div>
          )
        })}
      </div>
      <div className="flex justify-between pt-2 text-[13px] text-[rgba(235,235,245,0.6)]">
        <span>{shortDate(days[0].date)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#30D158]" /> Earned
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[rgba(235,235,245,0.3)]" /> Missed
          </span>
        </span>
        <span>Today</span>
      </div>
    </div>
  )
}
