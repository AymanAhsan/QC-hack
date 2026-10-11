import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon } from '@phosphor-icons/react'
import { cardById, nikeStack, sampleCart, type Transaction } from '../../data/data'
import { SCAN_STAGE_LABEL, scanRanking, useScanFlow, type ScanStage } from '../../shared/derive'
import { celebrate } from '../../shared/confetti'
import { playChime, playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Money } from '../../shared/Money'
import { Sheet } from '../../shared/Sheet'
import type { DemoSession } from '../../shared/session'
import { handle, panel } from './sheets'
import { CardArt, Masthead, MerchantMark, PrimaryButton, Tally, TextButton, focusRing, hairline, muted, serif } from './ui'

const enter = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6, transition: { duration: 0.15 } } }
const springIn = { type: 'spring', duration: 0.45, bounce: 0 } as const
const STAGES = ['reading', 'coupons', 'cards'] as const

export function ScanScreen({ session, onSeeRewards }: { session: DemoSession; onSeeRewards: () => void }) {
  const flow = useScanFlow()
  const [image, setImage] = useState<string | null>(null)
  const [logged, setLogged] = useState<Transaction | null>(null)

  useEffect(() => () => (image ? URL.revokeObjectURL(image) : undefined), [image])

  const start = (file?: File) => {
    setLogged(null)
    setImage(file ? URL.createObjectURL(file) : null)
    flow.start()
  }
  const restart = () => {
    setLogged(null)
    setImage(null)
    flow.reset()
  }

  const scanning = flow.stage !== 'idle' && flow.stage !== 'result'

  return (
    <div className="pb-28">
      <Masthead title="Scan" kicker="Online orders" />
      <AnimatePresence mode="wait" initial={false}>
        {flow.stage === 'result' ? (
          <motion.div key="result" {...enter} transition={springIn}>
            <Result fromUpload={!!image} session={session} logged={logged} onLogged={setLogged} onRestart={restart} onSeeRewards={onSeeRewards} />
          </motion.div>
        ) : (
          <motion.div key="start" {...enter} transition={springIn} className="px-5">
            <Rule progress={scanning} />
            <p className={`${serif} pt-5 text-[34px] leading-[38px] tracking-[-0.4px]`}>
              {scanning ? (
                'Reading your cart…'
              ) : (
                <>
                  What's in <em className="italic">your</em> cart?
                </>
              )}
            </p>
            <p className={`max-w-[34ch] pt-2 text-[16px] leading-[23px] ${muted}`}>
              Upload a screenshot of an online cart. We stack the best coupon with the best card you carry.
            </p>
            {image && scanning ? (
              <motion.img
                src={image}
                alt="Your cart screenshot"
                className="mt-5 h-40 w-28 rounded-[6px] object-cover shadow-[0_1px_2px_rgba(20,20,20,0.15),0_10px_24px_-10px_rgba(20,20,20,0.35)]"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springIn}
              />
            ) : null}
            <ol className="mt-6 border-t-[0.5px] border-[rgba(20,20,20,0.2)]" aria-live="polite">
              {STAGES.map((s, i) => (
                <StageLine key={s} index={i} label={SCAN_STAGE_LABEL[s]} stage={flow.stage} />
              ))}
            </ol>
            <AnimatePresence initial={false}>
              {!scanning ? (
                <motion.div key="actions" className="pt-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                  <label
                    className={`flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-[#141414] text-[16px] font-semibold text-[#FAF9F6] transition-transform duration-150 active:scale-[0.98] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#141414]`}
                  >
                    Choose a screenshot
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) start(f)
                      }}
                    />
                  </label>
                  <div className="flex justify-center pt-2">
                    <TextButton onClick={() => start()}>Try a sample cart</TextButton>
                  </div>
                  <p className={`pt-2 text-center text-[14px] ${muted}`}>PNG, JPEG, or WEBP. Coupons are demo offers.</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** A hairline that fills while scanning: the page's only progress indicator. */
function Rule({ progress }: { progress: boolean }) {
  return (
    <div className="relative h-[2px] overflow-hidden bg-[#141414]/10">
      {progress ? (
        <motion.div className="absolute inset-0 origin-left bg-[#141414]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.85, ease: 'linear' }} />
      ) : null}
    </div>
  )
}

function StageLine({ index, label, stage }: { index: number; label: string; stage: ScanStage }) {
  const at = stage === 'idle' ? -1 : stage === 'result' ? 3 : STAGES.indexOf(stage)
  const done = index < at
  const active = index === at
  const idle = stage === 'idle'
  return (
    <li className={`flex items-center gap-4 py-3.5 ${hairline}`}>
      <span className={`${serif} grid w-6 place-items-center text-[26px] leading-none ${done ? 'text-[#0F7B4A]' : ''}`}>
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.3, bounce: 0.4 }}>
              <CheckIcon size={20} weight="bold" />
            </motion.span>
          ) : (
            <motion.span key="n" exit={{ opacity: 0, scale: 0.8 }}>
              {index + 1}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className={`text-[16px] transition-colors duration-200 ${idle || active || done ? 'text-[#141414]' : 'text-[#141414]/45'}`}>
        {idle ? ['Read the items and total', 'Check every coupon', 'Rank the cards you carry'][index] : label}
      </span>
      {active ? <span className="ml-auto size-3.5 motion-safe:animate-spin rounded-full border-[1.5px] border-[#141414]/20 border-t-[#141414]" aria-hidden /> : null}
    </li>
  )
}

function Result({
  fromUpload,
  session,
  logged,
  onLogged,
  onRestart,
  onSeeRewards,
}: {
  fromUpload: boolean
  session: DemoSession
  logged: Transaction | null
  onLogged: (t: Transaction) => void
  onRestart: () => void
  onSeeRewards: () => void
}) {
  const stack = nikeStack
  const best = cardById[stack.winner_card_id ?? 'apple-card']
  const bestEval = stack.ranking.find((r) => r.is_winner)!
  const [why, setWhy] = useState(false)

  return (
    <div className="px-5">
      <div className={`flex items-center gap-3 border-t-[0.5px] border-[rgba(20,20,20,0.2)] py-3 ${hairline}`}>
        <MerchantMark id={stack.merchant.id} name={stack.merchant.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold">{stack.merchant.name}</div>
          <div className={`text-[14px] ${muted}`}>{fromUpload ? 'Demo reads every screenshot as the sample cart' : 'Sample cart'}</div>
        </div>
        <span className="text-[15px] tabular-nums">{money(stack.original_total_cents)}</span>
      </div>

      <div className="pb-2 pt-6">
        <p className={`text-[15px] ${muted}`}>You get back</p>
        <p className={`${serif} text-[80px] leading-[80px] tracking-[-1.5px] text-[#0F7B4A]`}>
          <Money cents={stack.total_value_cents} />
        </p>
        <p className="pt-1 text-[15px]">
          {stack.total_value_pct.toFixed(1)}% back on a {money(stack.original_total_cents)} cart
        </p>
      </div>

      <dl className="mt-5 border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        {stack.coupon ? (
          <div className={`flex items-center gap-3 py-3.5 ${hairline}`}>
            <span className="w-12 shrink-0 text-[13px] font-semibold uppercase tracking-[1.2px]">Code</span>
            <dt className="min-w-0 flex-1">
              <span className="block font-[family-name:var(--font-mono)] text-[16px] font-semibold tracking-[0.5px]">{stack.coupon.coupon.code}</span>
              <span className={`block text-[14px] ${muted}`}>{stack.coupon.coupon.description} · demo offer</span>
            </dt>
            <dd className="text-[16px] tabular-nums text-[#0F7B4A]">−{money(stack.coupon.savings_cents)}</dd>
          </div>
        ) : null}
        <div className={`flex items-center gap-3 py-3.5 ${hairline}`}>
          <span className="w-12 shrink-0 text-[13px] font-semibold uppercase tracking-[1.2px]">Card</span>
          <dt className="flex min-w-0 flex-1 items-center gap-3">
            <span className="block h-[26px] w-[40px] shrink-0 rounded-[4px] shadow-[0_1px_2px_rgba(20,20,20,0.18)]">
              <CardArt card={best} size="mini" />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-medium">{best.name}</span>
              <span className={`block text-[14px] ${muted}`}>3% at Nike on {money(stack.charge_cents)}</span>
            </span>
          </dt>
          <dd className="text-[16px] tabular-nums text-[#0F7B4A]">+{money(bestEval.value_cents)}</dd>
        </div>
      </dl>
      <TextButton onClick={() => setWhy(true)}>Why this stack</TextButton>

      <div className="pt-6">
        <h3 className={`pb-1.5 text-[13px] font-semibold uppercase tracking-[1.2px] ${hairline}`}>In the cart</h3>
        <ul>
          {sampleCart.items.map((it) => (
            <li key={it.name} className={`flex gap-3 py-2.5 text-[15px] ${hairline}`}>
              <span className={`w-6 shrink-0 tabular-nums ${muted}`}>{it.qty}×</span>
              <span className="min-w-0 flex-1">{it.name}</span>
              <span className="tabular-nums">{money(it.priceCents)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-9">
        <AnimatePresence mode="wait" initial={false}>
          {logged ? (
            <motion.div key="logged" {...enter} transition={springIn}>
              <Logged tx={logged} streak={session.stats.streak} onSeeRewards={onSeeRewards} onRestart={onRestart} />
            </motion.div>
          ) : (
            <motion.div key="log" {...enter} transition={springIn}>
              <LogPurchase
                bestId={best.id}
                onLog={(cardId) => {
                  const tx = session.logScan(cardId)
                  playChime()
                  if (tx.missed_cents === 0) celebrate({ colors: ['#141414', '#0F7B4A', '#D9D3C4'], origin: { x: 0.5, y: 0.8 }, scalar: 0.9 })
                  onLogged(tx)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <WhyStackSheet open={why} onOpenChange={setWhy} />
    </div>
  )
}

function LogPurchase({ bestId, onLog }: { bestId: string; onLog: (cardId: string) => void }) {
  const [choosing, setChoosing] = useState(false)
  const [picked, setPicked] = useState(bestId)
  const ranking = scanRanking()
  return (
    <div>
      <p className={`${serif} text-[32px] leading-[36px] tracking-[-0.3px]`}>
        Paid with <em className="italic">{cardById[bestId].name}</em>?
      </p>
      <AnimatePresence initial={false}>
        {choosing ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
            className="overflow-hidden"
          >
            <div role="radiogroup" aria-label="Card used" className="mt-4 border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
              {ranking.map((r) => {
                const on = picked === r.card_id
                return (
                  <button
                    key={r.card_id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      playTick()
                      setPicked(r.card_id)
                    }}
                    className={`flex h-[52px] w-full items-center gap-3 text-left ${hairline} ${focusRing}`}
                  >
                    <span className="block h-[22px] w-[34px] shrink-0 rounded-[3px] shadow-[0_1px_2px_rgba(20,20,20,0.18)]">
                      <CardArt card={r.card} size="mini" />
                    </span>
                    <span className="flex-1 text-[16px]">{r.card.name}</span>
                    <span className={`text-[15px] tabular-nums ${muted}`}>+{money(r.value_cents)}</span>
                    <span className={`grid size-5 place-items-center rounded-full ${on ? 'bg-[#141414]' : 'shadow-[inset_0_0_0_1px_rgba(20,20,20,0.5)]'}`}>
                      {on ? <span className="size-2 rounded-full bg-[#FAF9F6]" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="pt-5">
        <PrimaryButton onClick={() => onLog(picked)}>{picked === bestId ? 'Log purchase' : `Log with ${cardById[picked]?.name}`}</PrimaryButton>
      </div>
      {!choosing ? (
        <div className="flex justify-center pt-1">
          <TextButton onClick={() => setChoosing(true)}>I used a different card</TextButton>
        </div>
      ) : null}
      <p className={`pt-2 text-center text-[14px] ${muted}`}>Simulated purchase · nothing is charged</p>
    </div>
  )
}

function Logged({ tx, streak, onSeeRewards, onRestart }: { tx: Transaction; streak: number; onSeeRewards: () => void; onRestart: () => void }) {
  const maxed = tx.missed_cents === 0
  return (
    <div className="border-t-[0.5px] border-[rgba(20,20,20,0.2)] pt-5">
      <p className={`text-[13px] font-semibold uppercase tracking-[1.2px] ${maxed ? 'text-[#0F7B4A]' : ''}`}>{maxed ? 'Logged · maximized' : 'Logged'}</p>
      <p className={`${serif} pt-1 text-[56px] leading-[60px] tracking-[-1px] ${maxed ? 'text-[#0F7B4A]' : ''}`}>+{money(tx.earned_cents)}</p>
      <p className={`pt-1 text-[16px] ${muted}`}>
        {maxed
          ? 'Best card, best coupon. Nothing left on the table.'
          : `${cardById[tx.best_card_id ?? '']?.name} would have earned ${money(tx.missed_cents)} more.`}
      </p>
      {maxed ? (
        <div className={`mt-5 flex items-center justify-between py-3 border-y-[0.5px] border-[rgba(20,20,20,0.2)]`}>
          <span className="text-[15px] font-medium">Best-card streak</span>
          <span className="flex items-center gap-3">
            <Tally count={streak} />
            <span className="text-[15px] font-semibold tabular-nums">{streak}</span>
          </span>
        </div>
      ) : null}
      <div className="pt-6">
        <PrimaryButton onClick={onSeeRewards}>See Rewards</PrimaryButton>
      </div>
      <div className="flex justify-center pt-1">
        <TextButton onClick={onRestart}>Scan another cart</TextButton>
      </div>
    </div>
  )
}

function WhyStackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const stack = nikeStack
  const ranking = scanRanking()
  const max = Math.max(...ranking.map((r) => r.value_cents), 1)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Why this stack" hideTitle panelClassName={panel} handleClassName={handle}>
      <div className="pb-4 pt-2">
        <p className={`pb-1 text-[13px] font-medium ${muted}`}>Nike · {money(stack.original_total_cents)}</p>
        <p className={`${serif} text-[32px] leading-[36px]`}>Why this stack</p>
      </div>
      <p className="pb-2 text-[13px] font-semibold uppercase tracking-[1.2px]">Coupons checked</p>
      <ul className="border-t-[0.5px] border-[rgba(20,20,20,0.2)]">
        {stack.coupons_considered.map((c) => {
          const chosen = c.coupon.code === stack.coupon?.coupon.code
          return (
            <li key={c.coupon.code} className={`flex items-center gap-3 py-3 ${hairline}`}>
              <span className="min-w-0 flex-1">
                <span className={`block font-[family-name:var(--font-mono)] text-[15px] ${chosen ? 'font-semibold' : ''}`}>{c.coupon.code}</span>
                <span className={`block text-[14px] ${muted}`}>{c.eligible ? c.coupon.description : c.reason}</span>
              </span>
              <span className={`text-[15px] tabular-nums ${chosen ? 'font-semibold text-[#0F7B4A]' : muted}`}>{c.eligible ? `−${money(c.savings_cents)}` : 'Doesn’t apply'}</span>
            </li>
          )
        })}
      </ul>
      <p className="pb-3 pt-7 text-[13px] font-semibold uppercase tracking-[1.2px]">Cards on {money(stack.charge_cents)}</p>
      <ul className="space-y-3.5">
        {ranking.map((r) => (
          <li key={r.card_id}>
            <div className="flex justify-between text-[15px]">
              <span>{r.card.name}</span>
              <span className={`tabular-nums ${r.is_winner ? 'font-semibold text-[#0F7B4A]' : ''}`}>{money(r.value_cents)}</span>
            </div>
            <div className="mt-1.5 h-[2px] bg-[#141414]/10">
              <motion.div
                className="h-full origin-left"
                style={{ background: r.is_winner ? '#0F7B4A' : '#141414' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.value_cents / max }}
                transition={{ type: 'spring', duration: 0.7, bounce: 0 }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
