import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon } from '@phosphor-icons/react'
import { cardById, nikeStack, sampleCart } from '../../data/data'
import { SCAN_STAGE_LABEL, scanRanking, useScanFlow, type ScanStage } from '../../shared/derive'
import { celebrate } from '../../shared/confetti'
import { coinBurst } from './coins'
import { playChime, playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Money } from '../../shared/Money'
import { Sheet } from '../../shared/Sheet'
import type { DemoSession } from '../../shared/session'
import type { Transaction } from '../../data/data'
import { CardFace, earnLabel, Emoji, LargeTitle, MerchantMark, Row, Section } from './ui'

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6, transition: { duration: 0.15 } } }
const springIn = { type: 'spring', duration: 0.45, bounce: 0 } as const

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

  return (
    <div className="pb-32">
      <LargeTitle>Scan</LargeTitle>
      <AnimatePresence mode="wait" initial={false}>
        {flow.stage === 'idle' ? (
          <motion.div key="idle" {...fade} transition={springIn}>
            <Idle onFile={start} onSample={() => start()} />
          </motion.div>
        ) : flow.stage !== 'result' ? (
          <motion.div key="scanning" {...fade} transition={springIn}>
            <Scanning stage={flow.stage} image={image} />
          </motion.div>
        ) : (
          <motion.div key="result" {...fade} transition={springIn}>
            <Result fromUpload={!!image} session={session} logged={logged} onLogged={setLogged} onRestart={restart} onSeeRewards={onSeeRewards} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Idle({ onFile, onSample }: { onFile: (f: File) => void; onSample: () => void }) {
  return (
    <div className="px-4 pt-2">
      <div className="n-panel flex flex-col items-center rounded-[26px] px-6 pb-6 pt-9 text-center">
        {/* A slow bob says "drop something here"; MotionConfig stills it under reduced motion. */}
        <motion.span
          className="block"
          animate={{ y: [0, -6, 0], rotate: [-4, 3, -4] }}
          transition={{ duration: 4.2, ease: 'easeInOut', repeat: Infinity }}
        >
          <Emoji name="receipt" size={88} className="drop-shadow-[0_14px_22px_rgba(0,0,0,0.45)]" />
        </motion.span>
        <h2 className="pt-5 text-[22px] font-bold leading-[28px]">Scan a cart screenshot</h2>
        <p className="max-w-[30ch] pt-2 text-[15px] leading-[20px] text-[rgba(235,235,245,0.6)]">
          We read the store and total, then stack the best coupon with the best card you have.
        </p>
        <label className="mt-7 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-full bg-white text-[17px] font-semibold text-black transition-transform duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white/70 active:scale-[0.98]">
          Choose screenshot
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
            }}
          />
        </label>
        <button type="button" onClick={onSample} className="mt-3 h-11 px-4 text-[17px] text-[#0A84FF] active:opacity-60">
          Try a sample cart
        </button>
      </div>
      <p className="px-4 pt-3 text-center text-[13px] text-[rgba(235,235,245,0.6)]">PNG, JPEG, or WEBP</p>
    </div>
  )
}

const STAGES: Exclude<ScanStage, 'idle' | 'result'>[] = ['reading', 'coupons', 'cards']

function Scanning({ stage, image }: { stage: ScanStage; image: string | null }) {
  const at = STAGES.indexOf(stage as (typeof STAGES)[number])
  return (
    <div className="px-4 pt-2">
      <div className="relative mx-auto h-[300px] w-[200px] overflow-hidden rounded-[18px] n-panel">
        {image ? (
          <img src={image} alt="Your cart screenshot" className="h-full w-full object-cover opacity-80" />
        ) : (
          <div className="space-y-3 p-4">
            <div className="h-3 w-16 rounded bg-white/25" />
            {sampleCart.items.map((it) => (
              <div key={it.name} className="flex gap-2">
                <div className="size-10 shrink-0 rounded-md bg-white/10" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-2 w-full rounded bg-white/15" />
                  <div className="h-2 w-2/3 rounded bg-white/10" />
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-3">
              <div className="h-2.5 w-14 rounded bg-white/20" />
              <div className="h-2.5 w-10 rounded bg-white/25" />
            </div>
          </div>
        )}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-[#0A84FF]/25 to-transparent"
          initial={{ y: -64 }}
          animate={{ y: 300 }}
          transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }}
        />
        <motion.div aria-hidden className="absolute inset-x-0 h-[1.5px] bg-[#0A84FF]" initial={{ y: -32 }} animate={{ y: 332 }} transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }} />
      </div>
      <ul className="mx-auto mt-7 w-fit space-y-3" aria-live="polite">
        {STAGES.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-[17px] transition-colors duration-200 ${i <= at ? 'text-white' : 'text-white/30'}`}>
            <span className="grid size-6 place-items-center">
              {i < at ? (
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.3, bounce: 0.4 }}>
                  <CheckIcon size={18} weight="bold" className="text-[#30D158]" />
                </motion.span>
              ) : i === at ? (
                <span className="size-4 motion-safe:animate-spin rounded-full border-2 border-white/25 border-t-white" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            <span className={i === at ? 'n-shimmer' : undefined}>{SCAN_STAGE_LABEL[s]}</span>
          </li>
        ))}
      </ul>
    </div>
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
  const [itemsOpen, setItemsOpen] = useState(false)

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3 px-4">
        <MerchantMark id={stack.merchant.id} name={stack.merchant.name} size={44} />
        <div className="min-w-0">
          <div className="text-[20px] font-semibold leading-[25px]">{stack.merchant.name}</div>
          <div className="text-[15px] text-[rgba(235,235,245,0.6)]">{fromUpload ? 'From your screenshot' : 'Sample cart'}</div>
        </div>
      </div>

      <div className="px-4 text-center">
        <div className="text-[15px] text-[rgba(235,235,245,0.6)]">You get back</div>
        <div className="font-[family-name:var(--font-sf-rounded)] text-[64px] font-bold leading-[70px] tracking-[-1px] text-[#30D158]">
          <Money cents={stack.total_value_cents} />
        </div>
        <div className="text-[15px] text-[rgba(235,235,245,0.6)]">
          {stack.total_value_pct.toFixed(1)}% of {money(stack.original_total_cents)}
        </div>
      </div>

      <Section>
        {stack.coupon ? (
          <Row
            leading={<Emoji name="ticket" size={36} />}
            title={<span className="font-mono font-semibold tracking-[0.5px]">{stack.coupon.coupon.code}</span>}
            subtitle={stack.coupon.coupon.description}
            trailing={<span className="text-[17px] tabular-nums text-[#30D158]">−{money(stack.coupon.savings_cents)}</span>}
          />
        ) : null}
        <Row
          leading={
            <span className="block h-[26px] w-9">
              <CardFace card={best} compact />
            </span>
          }
          title={best.name}
          subtitle={`3% at Nike on ${money(stack.charge_cents)}`}
          trailing={<span className="text-[17px] tabular-nums text-[#30D158]">+{money(bestEval.value_cents)}</span>}
        />
        <Row title={<span className="text-[#0A84FF]">Why this stack</span>} chevron onClick={() => setWhy(true)} last />
      </Section>

      <Section>
        <Row
          title={`${sampleCart.items.length} items`}
          trailing={<span className="tabular-nums text-[rgba(235,235,245,0.6)]">{money(sampleCart.subtotalCents)}</span>}
          onClick={() => setItemsOpen((o) => !o)}
          chevron
          last={!itemsOpen}
        />
        <AnimatePresence initial={false}>
          {itemsOpen ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', duration: 0.35, bounce: 0 }} className="overflow-hidden">
              {sampleCart.items.map((it, i) => (
                <Row
                  key={it.name}
                  title={<span className="whitespace-normal text-[15px]">{it.name}</span>}
                  subtitle={it.qty > 1 ? `Qty ${it.qty}` : undefined}
                  trailing={<span className="text-[15px] tabular-nums">{money(it.priceCents)}</span>}
                  last={i === sampleCart.items.length - 1}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Section>

      <AnimatePresence mode="wait" initial={false}>
        {logged ? (
          <motion.div key="logged" {...fade} transition={springIn}>
            <Logged tx={logged} streak={session.stats.streak} onSeeRewards={onSeeRewards} onRestart={onRestart} />
          </motion.div>
        ) : (
          <motion.div key="log" {...fade} transition={springIn}>
            <LogPurchase
              bestId={best.id}
              onLog={(cardId) => {
                const tx = session.logScan(cardId)
                playChime()
                if (tx.missed_cents === 0) {
                  celebrate({ colors: ['#30D158', '#ffffff', best.glow], origin: { x: 0.5, y: 0.75 } })
                  coinBurst({ x: 0.5, y: 0.75 })
                }
                onLogged(tx)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <WhyStackSheet open={why} onOpenChange={setWhy} />
    </div>
  )
}

function LogPurchase({ bestId, onLog }: { bestId: string; onLog: (cardId: string) => void }) {
  const [choosing, setChoosing] = useState(false)
  const [picked, setPicked] = useState(bestId)
  const ranking = scanRanking()
  const pickedName = cardById[picked]?.name
  return (
    <div className="px-4">
      <div className="n-panel rounded-[26px] p-5">
        <p className="text-center text-[20px] font-semibold">Paid with {cardById[bestId].name}?</p>
        <AnimatePresence initial={false}>
          {choosing ? (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
              className="-mx-2 overflow-hidden pt-3"
              role="radiogroup"
              aria-label="Card used"
            >
              {ranking.map((r) => (
                <li key={r.card_id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={picked === r.card_id}
                    onClick={() => {
                      playTick()
                      setPicked(r.card_id)
                    }}
                    className="flex h-12 w-full items-center gap-3 rounded-[12px] px-2 text-left active:bg-white/5"
                  >
                    <span className="block h-[22px] w-8">
                      <CardFace card={r.card} compact />
                    </span>
                    <span className="flex-1 text-[17px]">{r.card.name}</span>
                    <span className="text-[15px] tabular-nums text-[rgba(235,235,245,0.6)]">{earnLabel(r.value_cents)}</span>
                    <span className={`grid size-[22px] place-items-center rounded-full ${picked === r.card_id ? 'bg-[#0A84FF]' : 'shadow-[inset_0_0_0_1.5px_rgba(235,235,245,0.3)]'}`}>
                      {picked === r.card_id ? <CheckIcon size={13} weight="bold" /> : null}
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => onLog(picked)}
          className="mt-5 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black transition-transform duration-150 active:scale-[0.98]"
        >
          {picked === bestId ? 'Log purchase' : `Log with ${pickedName}`}
        </button>
        {!choosing ? (
          <button type="button" onClick={() => setChoosing(true)} className="mt-2 h-11 w-full text-[17px] text-[#0A84FF]">
            I used a different card
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Logged({ tx, streak, onSeeRewards, onRestart }: { tx: Transaction; streak: number; onSeeRewards: () => void; onRestart: () => void }) {
  const maxed = tx.missed_cents === 0
  return (
    <div className="px-4">
      <div className="n-panel flex flex-col items-center rounded-[26px] px-5 pb-5 pt-7 text-center">
        {maxed ? (
          <Emoji name="party-popper" size={72} pop />
        ) : (
          <motion.span
            className="grid size-14 place-items-center rounded-full bg-white/[0.12]"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.45 }}
          >
            <CheckIcon size={30} weight="bold" className="text-white" />
          </motion.span>
        )}
        <p className="pt-4 text-[20px] font-semibold">{maxed ? `+${money(tx.earned_cents)} back` : `Logged · ${money(tx.missed_cents)} missed`}</p>
        <p className="pt-1 text-[15px] text-[rgba(235,235,245,0.6)]">
          {maxed ? 'Best card, best coupon. Nothing left on the table.' : `${cardById[tx.best_card_id ?? '']?.name} would have earned ${money(tx.best_possible_cents)}.`}
        </p>
        {maxed && streak > 0 ? (
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#FF9F0A]/15 px-3 py-1.5 text-[15px] font-semibold text-[#FF9F0A]">
            <Emoji name="fire" size={20} /> {streak} best-card {streak === 1 ? 'pick' : 'picks'} in a row
          </span>
        ) : null}
        <button type="button" onClick={onSeeRewards} className="mt-6 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black active:scale-[0.98]">
          See Rewards
        </button>
        <button type="button" onClick={onRestart} className="mt-2 h-11 w-full text-[17px] text-[#0A84FF]">
          Scan another cart
        </button>
      </div>
    </div>
  )
}

function WhyStackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const stack = nikeStack
  const ranking = scanRanking()
  const max = Math.max(...ranking.map((r) => r.value_cents), 1)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Why this stack" panelClassName="n-sheet rounded-t-[28px] text-white" handleClassName="bg-white/30" hideTitle>
      <div className="pb-4 pt-2 text-center text-[22px] font-bold">Why this stack</div>
      <h3 className="px-1 pb-2 text-[13px] uppercase tracking-[0.6px] text-[rgba(235,235,245,0.6)]">Coupons checked</h3>
      <div className="overflow-hidden n-well rounded-[16px]">
        {stack.coupons_considered.map((c, i, all) => (
          <Row
            key={c.coupon.code}
            title={<span className="font-mono">{c.coupon.code}</span>}
            subtitle={c.eligible ? c.coupon.description : c.reason}
            trailing={<span className={`tabular-nums ${c.coupon.code === stack.coupon?.coupon.code ? 'text-[#30D158]' : 'text-[rgba(235,235,245,0.6)]'}`}>{c.eligible ? `−${money(c.savings_cents)}` : 'N/A'}</span>}
            last={i === all.length - 1}
          />
        ))}
      </div>
      <h3 className="px-1 pb-2 pt-6 text-[13px] uppercase tracking-[0.6px] text-[rgba(235,235,245,0.6)]">Cards on {money(stack.charge_cents)}</h3>
      <ul className="space-y-3 n-well rounded-[16px] p-4">
        {ranking.map((r) => (
          <li key={r.card_id}>
            <div className="flex justify-between text-[15px]">
              <span>{r.card.name}</span>
              <span className="tabular-nums">{money(r.value_cents)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ background: r.is_winner ? '#30D158' : 'rgba(255,255,255,0.4)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.value_cents / max }}
                transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
