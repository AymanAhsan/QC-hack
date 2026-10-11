// Rewards (the "missed" tab): what your cards earned over the last 30 days, what
// they left behind, your best-card streak, and every purchase. All from
// GET /api/missed through the session, refetched after every logged purchase.

import { motion } from 'motion/react'
import { CheckCircleIcon } from '@phosphor-icons/react'
import type { Session } from '../../session'
import type { MissedResponse } from '../../types'
import { Count, Money } from '../../components/Money'
import { CardFace, Emoji, ErrorNotice, LargeTitle, Loading, MerchantMark, Row, Section } from '../../components/ui'
import { topFix } from '../../lib/derive'
import { money, relativeDay, shortDate } from '../../lib/format'
import { CARD_TEMPLATES } from '../../lib/merchants'

const RING = 168
const STROKE = 18
const muted = 'text-[rgba(235,235,245,0.6)]'

export function RewardsScreen({ session }: { session: Session }) {
  const { stats, missed } = session
  if (!missed) {
    return (
      <div className="pb-32">
        <LargeTitle>Rewards</LargeTitle>
        <div className="px-4">{session.missedError ? <ErrorNotice error={session.missedError} onRetry={session.retryMissed} /> : <Loading label="Adding up your rewards…" />}</div>
      </div>
    )
  }

  const byId = Object.fromEntries(session.cards.map((c) => [c.id, c.name]))
  // A purchase can name a card that's since been removed: fall back to its type's name.
  const cardName = (id: string | null) => (id ? (byId[id] ?? CARD_TEMPLATES.find((t) => t.type === id)?.name ?? 'a card') : 'no card')
  const fix = topFix(missed, session.cards)
  const pctCaptured = Math.round(stats.captureRate * 100)
  const r = (RING - STROKE) / 2
  const recent = session.history.slice(0, 20)

  return (
    <div className="pb-32">
      <LargeTitle>Rewards</LargeTitle>
      <div className="space-y-7 pt-2 wide:grid wide:grid-cols-2 wide:items-start wide:gap-6 wide:space-y-0">
        <div className="space-y-7">
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
                  <div className={`pt-1 text-[13px] ${muted}`}>captured</div>
                </div>
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <Stat label="Earned" className="text-[#30D158]" cents={stats.earnedCents} />
              <Stat label="Saved with codes" cents={stats.couponSavedCents} />
              <Stat label="Left on the table" cents={stats.missedCents} />
              <div className={`text-[13px] ${muted}`}>
                {missed.window_label} · {stats.count} {stats.count === 1 ? 'purchase' : 'purchases'}
              </div>
            </div>
          </div>

          <Section>
            <Row
              leading={<Emoji name="fire" size={36} />}
              title="Best-card streak"
              subtitle={stats.streak ? 'Keep paying with the card we pick' : 'Pay with the best card to start one'}
              trailing={
                <span className="font-[family-name:var(--font-sf-rounded)] text-[22px] font-bold">
                  <Count value={stats.streak} />
                </span>
              }
            />
            <Row
              leading={<Emoji name="bullseye" size={36} />}
              title="Maximized purchases"
              trailing={
                <span className={`tabular-nums ${muted}`}>
                  {stats.maximized} of {session.history.length}
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
                  <div className={`text-[15px] ${muted}`}>
                    {fix.rateLabel} · {money(fix.missedCents)} missed there in {missed.window_days} days
                  </div>
                </div>
              </div>
            </Section>
          ) : null}

          {missed.daily.length ? (
            <Section title={missed.window_label}>
              <DailyChart missed={missed} />
            </Section>
          ) : null}
        </div>

        <div className="space-y-3">
          <Section title="Purchases">
            {recent.length ? (
              recent.map((t, i) => {
                const maxed = t.missed_cents === 0
                return (
                  <Row
                    key={t.id}
                    leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} />}
                    title={t.merchant_name}
                    subtitle={maxed ? `${relativeDay(t.ts)} · ${cardName(t.card_used_id)}` : `Used ${cardName(t.card_used_id)} · best ${cardName(t.best_card_id)}`}
                    trailing={
                      maxed ? (
                        <span className="flex items-center gap-1 text-[15px] tabular-nums text-[#30D158]">
                          <CheckCircleIcon size={16} weight="fill" />
                          {t.earned_cents ? `+${money(t.earned_cents)}` : 'Best card'}
                        </span>
                      ) : (
                        <div className="text-right tabular-nums">
                          <div className="text-[17px]">{money(t.missed_cents)}</div>
                          <div className={`text-[13px] ${muted}`}>missed</div>
                        </div>
                      )
                    }
                    last={i === recent.length - 1}
                  />
                )
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-[17px] font-semibold">No purchases yet</p>
                <p className={`pt-1 text-[15px] ${muted}`}>Pay in a store or log a scanned cart, and it shows up here.</p>
              </div>
            )}
          </Section>
          <p className={`px-8 text-center text-[13px] ${muted}`}>Points valued at each card's typical rate.</p>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, cents, className = '' }: { label: string; cents: number; className?: string }) {
  return (
    <div>
      <div className={`text-[13px] ${muted}`}>{label}</div>
      <div className={`font-[family-name:var(--font-sf-rounded)] text-[24px] font-bold ${className}`}>
        <Money cents={cents} />
      </div>
    </div>
  )
}

function DailyChart({ missed }: { missed: MissedResponse }) {
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
              className="flex flex-1 origin-bottom flex-col-reverse overflow-hidden rounded-b-[1px] rounded-t-[3px]"
              style={{ height: h, background: total ? 'rgba(235,235,245,0.22)' : 'rgba(235,235,245,0.08)' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0, delay: i * 0.012 }}
              title={`${shortDate(`${d.date}T12:00:00`)}: ${money(d.earned_cents)} earned, ${money(d.missed_cents)} missed`}
            >
              <div className="bg-[#30D158]" style={{ height: `${earnedShare * 100}%` }} />
            </motion.div>
          )
        })}
      </div>
      <div className={`flex justify-between pt-2 text-[13px] ${muted}`}>
        <span>{shortDate(`${days[0].date}T12:00:00`)}</span>
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
