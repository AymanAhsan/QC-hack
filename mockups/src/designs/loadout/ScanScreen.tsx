import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDownIcon, CheckIcon, FireIcon, ReceiptIcon, TicketIcon } from '@phosphor-icons/react'
import { cardById, nikeStack, sampleCart, type Transaction } from '../../data/data'
import { SCAN_STAGE_LABEL, scanRanking, useScanFlow, type ScanStage } from '../../shared/derive'
import { celebrate } from '../../shared/confetti'
import { playChime, playFanfare, playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Money } from '../../shared/Money'
import { Sheet } from '../../shared/Sheet'
import type { DemoSession } from '../../shared/session'
import { SheetTitle, sheetHandle, sheetPanel } from './sheets'
import { CardArt, GhostButton, L, Label, MerchantMark, Panel, PrimaryButton, Row, ScreenHeader } from './ui'

const swap = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.14 } },
  transition: { type: 'spring', duration: 0.42, bounce: 0 },
} as const

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
      <ScreenHeader kicker="Online orders" title="Scan" />
      <AnimatePresence mode="wait" initial={false}>
        {flow.stage === 'idle' ? (
          <motion.div key="idle" {...swap}>
            <Idle onFile={start} onSample={() => start()} />
          </motion.div>
        ) : flow.stage !== 'result' ? (
          <motion.div key="scan" {...swap}>
            <Scanning stage={flow.stage} image={image} />
          </motion.div>
        ) : (
          <motion.div key="result" {...swap}>
            <Result fromUpload={!!image} session={session} logged={logged} onLogged={setLogged} onRestart={restart} onSeeRewards={onSeeRewards} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Idle({ onFile, onSample }: { onFile: (f: File) => void; onSample: () => void }) {
  return (
    <div className="px-5 pt-2">
      <Panel className="px-6 pb-6 pt-8">
        <div className="relative mx-auto grid h-[120px] w-[96px] place-items-center rounded-[14px] bg-[#1A1E27] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          <ReceiptIcon size={40} className="text-[#EEF0F4]" />
          <span aria-hidden className="absolute -inset-3 rounded-[20px] [border:1.5px_dashed_rgba(238,240,244,0.22)]" />
        </div>
        <h2 className="pt-7 text-center text-[22px] font-semibold tracking-[-0.01em]">Scan a cart screenshot</h2>
        <p className="mx-auto max-w-[30ch] pt-2 text-center text-[15px] leading-[21px] text-[#9BA3B1]">
          We read the store and total, then pair the best coupon with the best card you carry.
        </p>
        <label className="mt-7 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[14px] bg-[#9BE36D] text-[17px] font-semibold text-[#0B0D12] transition-transform duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#EEF0F4] active:scale-[0.98]">
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
        <GhostButton onClick={onSample} className="mt-2">
          Try a sample cart
        </GhostButton>
      </Panel>
      <p className="pt-3 text-center font-mono text-[12px] text-[#9BA3B1]">PNG · JPEG · WEBP — coupons are demo offers</p>
    </div>
  )
}

const STAGES: Exclude<ScanStage, 'idle' | 'result'>[] = ['reading', 'coupons', 'cards']

function Scanning({ stage, image }: { stage: ScanStage; image: string | null }) {
  const at = STAGES.indexOf(stage as (typeof STAGES)[number])
  return (
    <div className="px-5 pt-4">
      <div className="relative mx-auto h-[260px] w-[180px] overflow-hidden rounded-[16px] bg-[#13161D] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
        {image ? (
          <img src={image} alt="Your cart screenshot" className="h-full w-full object-cover opacity-70" />
        ) : (
          <div className="space-y-3 p-4">
            <div className="h-3 w-14 rounded bg-white/20" />
            {sampleCart.items.map((it) => (
              <div key={it.name} className="flex gap-2">
                <div className="size-9 shrink-0 rounded-md bg-white/[0.08]" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-2 w-full rounded bg-white/[0.12]" />
                  <div className="h-2 w-2/3 rounded bg-white/[0.08]" />
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-3">
              <div className="h-2.5 w-12 rounded bg-white/15" />
              <div className="h-2.5 w-9 rounded bg-white/20" />
            </div>
          </div>
        )}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 h-[2px] bg-[#EEF0F4]/80"
          initial={{ y: 0 }}
          animate={{ y: 258 }}
          transition={{ duration: 1, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
        />
      </div>

      <div className="mx-auto mt-8 max-w-[300px]" aria-live="polite">
        <div className="flex gap-1.5" aria-hidden>
          {STAGES.map((s, i) => (
            <div key={s} className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full origin-left rounded-full bg-[#EEF0F4]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: i < at ? 1 : i === at ? 0.6 : 0 }}
                transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
              />
            </div>
          ))}
        </div>
        <ul className="mt-5 space-y-3">
          {STAGES.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 font-mono text-[14px] transition-colors duration-200 ${i <= at ? 'text-[#EEF0F4]' : 'text-[#5E6676]'}`}>
              <span className="grid size-5 place-items-center">
                {i < at ? (
                  <CheckIcon size={16} weight="bold" className="text-[#9BE36D]" />
                ) : i === at ? (
                  <span className="size-3.5 motion-safe:animate-spin rounded-full border-2 border-white/20 border-t-[#EEF0F4]" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              {SCAN_STAGE_LABEL[s]}
            </li>
          ))}
        </ul>
      </div>
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
    <div className="space-y-6 px-5">
      <div className="flex items-center gap-3">
        <MerchantMark id={stack.merchant.id} name={stack.merchant.name} size={42} />
        <div className="min-w-0">
          <div className="text-[18px] font-semibold">{stack.merchant.name}</div>
          <div className="text-[13px] text-[#9BA3B1]">{fromUpload ? 'Demo reads every screenshot as the sample cart' : 'Sample cart'}</div>
        </div>
      </div>

      <div>
        <Label>Total value back</Label>
        <div className="font-mono text-[56px] font-medium leading-[64px] tracking-[-0.02em] text-[#9BE36D] tabular-nums">
          <Money cents={stack.total_value_cents} />
        </div>
        <div className="font-mono text-[14px] tabular-nums text-[#9BA3B1]">
          {stack.total_value_pct.toFixed(1)}% of {money(stack.original_total_cents)}
        </div>
      </div>

      <div>
        <Label>The stack</Label>
        <Panel className="mt-2">
          {stack.coupon ? (
            <Row
              leading={
                <span className="grid size-[38px] place-items-center rounded-[10px] bg-[#1A1E27] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                  <TicketIcon size={20} weight="fill" />
                </span>
              }
              title={<span className="font-mono font-medium tracking-[0.04em]">{stack.coupon.coupon.code}</span>}
              subtitle={stack.coupon.coupon.description}
              trailing={<span className="font-mono text-[15px] tabular-nums text-[#9BE36D]">−{money(stack.coupon.savings_cents)}</span>}
            />
          ) : null}
          <Row
            leading={
              <span className="block h-[26px] w-[40px]">
                <CardArt card={best} mini />
              </span>
            }
            title={best.name}
            subtitle={`3% at Nike on ${money(stack.charge_cents)}`}
            trailing={<span className="font-mono text-[15px] tabular-nums text-[#9BE36D]">+{money(bestEval.value_cents)}</span>}
          />
          <Row title={<span className="underline decoration-white/30 underline-offset-4">Why this stack</span>} onClick={() => setWhy(true)} last />
        </Panel>
        <p className="pt-2 text-[12px] text-[#9BA3B1]">Coupons are demo offers, not verified codes.</p>
      </div>

      <Panel>
        <button
          type="button"
          aria-expanded={itemsOpen}
          onClick={() => setItemsOpen((o) => !o)}
          className="flex min-h-[56px] w-full items-center justify-between px-4 text-left focus-visible:bg-white/[0.04] focus-visible:shadow-[inset_0_0_0_2px_rgba(238,240,244,0.6)] focus-visible:outline-none"
        >
          <span className="text-[16px]">{sampleCart.items.length} items</span>
          <span className="flex items-center gap-2 font-mono text-[14px] tabular-nums text-[#9BA3B1]">
            {money(sampleCart.subtotalCents)}
            <motion.span animate={{ rotate: itemsOpen ? 180 : 0 }} transition={{ type: 'spring', duration: 0.3, bounce: 0 }}>
              <CaretDownIcon size={14} weight="bold" />
            </motion.span>
          </span>
        </button>
        <AnimatePresence initial={false}>
          {itemsOpen ? (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
              className="overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              {sampleCart.items.map((it) => (
                <li key={it.name} className="flex items-start justify-between gap-4 px-4 py-2.5 text-[14px]">
                  <span className="text-[#EEF0F4]">
                    {it.qty > 1 ? <span className="font-mono text-[#9BA3B1]">{it.qty}× </span> : null}
                    {it.name}
                  </span>
                  <span className="font-mono tabular-nums">{money(it.priceCents)}</span>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </Panel>

      <AnimatePresence mode="wait" initial={false}>
        {logged ? (
          <motion.div key="logged" {...swap}>
            <Logged tx={logged} streak={session.stats.streak} onSeeRewards={onSeeRewards} onRestart={onRestart} />
          </motion.div>
        ) : (
          <motion.div key="log" {...swap}>
            <LogPurchase
              bestId={best.id}
              onLog={(cardId) => {
                const tx = session.logScan(cardId)
                const maxed = tx.missed_cents === 0
                const milestone = maxed && [3, 5, 10].includes(session.stats.streak + 1)
                playChime()
                if (milestone) setTimeout(playFanfare, 350)
                if (maxed) celebrate({ colors: [L.money, '#ffffff', best.glow], origin: { x: 0.5, y: 0.78 }, size: milestone ? 'big' : 'small' })
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
  return (
    <div>
      <Panel className="p-5">
        <p className="text-[19px] font-semibold">Paid with {cardById[bestId].name}?</p>
        <p className="pt-0.5 text-[14px] text-[#9BA3B1]">Log it to keep your streak honest.</p>
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
              {ranking.map((r) => {
                const on = picked === r.card_id
                return (
                  <li key={r.card_id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        playTick()
                        setPicked(r.card_id)
                      }}
                      className={`flex h-12 w-full items-center gap-3 rounded-[12px] px-2 text-left transition-colors duration-150 ${on ? 'bg-white/[0.06]' : 'active:bg-white/[0.04]'}`}
                    >
                      <span className="block h-[20px] w-[32px] shrink-0">
                        <CardArt card={r.card} mini />
                      </span>
                      <span className="flex-1 text-[16px]">{r.card.name}</span>
                      <span className="font-mono text-[13px] tabular-nums text-[#9BA3B1]">+{money(r.value_cents)}</span>
                      <span className={`grid size-[22px] place-items-center rounded-full ${on ? 'bg-[#EEF0F4] text-[#0B0D12]' : 'shadow-[inset_0_0_0_1.5px_rgba(238,240,244,0.3)]'}`}>
                        {on ? <CheckIcon size={13} weight="bold" /> : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>
        <PrimaryButton className="mt-5" onClick={() => onLog(picked)}>
          {picked === bestId ? 'Log purchase' : `Log with ${cardById[picked]?.name}`}
        </PrimaryButton>
        {!choosing ? (
          <GhostButton className="mt-1" onClick={() => setChoosing(true)}>
            I used a different card
          </GhostButton>
        ) : null}
      </Panel>
      <p className="pt-2 text-center text-[12px] text-[#9BA3B1]">Simulated purchase · nothing is charged</p>
    </div>
  )
}

function Logged({ tx, streak, onSeeRewards, onRestart }: { tx: Transaction; streak: number; onSeeRewards: () => void; onRestart: () => void }) {
  const maxed = tx.missed_cents === 0
  return (
    <Panel className="flex flex-col items-center px-5 pb-5 pt-7 text-center">
      <motion.span
        className={`grid size-14 place-items-center rounded-full ${maxed ? 'bg-[#9BE36D] text-[#0B0D12]' : 'bg-[#1A1E27] text-[#EEF0F4]'}`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.45 }}
      >
        <CheckIcon size={28} weight="bold" />
      </motion.span>
      <p className="pt-4 font-mono text-[22px] font-medium tabular-nums">{maxed ? `+${money(tx.earned_cents)} back` : `${money(tx.missed_cents)} missed`}</p>
      <p className="max-w-[30ch] pt-1 text-[14px] text-[#9BA3B1]">
        {maxed ? 'Best coupon, best card. Nothing left on the table.' : `${cardById[tx.best_card_id ?? '']?.name} would have earned ${money(tx.best_possible_cents)}.`}
      </p>
      {maxed && streak > 0 ? (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1A1E27] px-3 py-1.5 text-[14px] font-medium shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          <FireIcon size={16} weight="fill" className="text-[#EEF0F4]" />
          <span className="font-mono tabular-nums">{streak}</span> best-card {streak === 1 ? 'pick' : 'picks'} in a row
        </span>
      ) : null}
      <PrimaryButton className="mt-6" onClick={onSeeRewards}>
        See Rewards
      </PrimaryButton>
      <GhostButton className="mt-1" onClick={onRestart}>
        Scan another cart
      </GhostButton>
    </Panel>
  )
}

function WhyStackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const stack = nikeStack
  const ranking = scanRanking()
  const max = Math.max(...ranking.map((r) => r.value_cents), 1)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Why this stack" panelClassName={sheetPanel} handleClassName={sheetHandle} hideTitle>
      <SheetTitle kicker={`${stack.merchant.name} · ${money(stack.subtotal_cents)}`} title="Why this stack" />
      <Label>Coupons checked</Label>
      <div className="mt-2 overflow-hidden rounded-[16px] bg-[#1A1E27]">
        {stack.coupons_considered.map((c, i, all) => {
          const chosen = c.coupon.code === stack.coupon?.coupon.code
          return (
            <Row
              key={c.coupon.code}
              title={<span className={`font-mono ${c.eligible ? '' : 'text-[#9BA3B1] line-through'}`}>{c.coupon.code}</span>}
              subtitle={c.eligible ? c.coupon.description : c.reason}
              trailing={<span className={`font-mono tabular-nums ${chosen ? 'text-[#9BE36D]' : 'text-[#9BA3B1]'}`}>{c.eligible ? `−${money(c.savings_cents)}` : 'N/A'}</span>}
              last={i === all.length - 1}
            />
          )
        })}
      </div>
      <div className="pt-6">
        <Label>Cards on {money(stack.charge_cents)}</Label>
      </div>
      <ol className="mt-3 space-y-3">
        {ranking.map((r, i) => (
          <li key={r.card_id}>
            <div className="flex justify-between text-[14px]">
              <span>
                <span className="mr-2 font-mono text-[12px] text-[#9BA3B1]">{String(i + 1).padStart(2, '0')}</span>
                {r.card.name}
              </span>
              <span className={`font-mono tabular-nums ${r.is_winner ? 'text-[#9BE36D]' : ''}`}>{money(r.value_cents)}</span>
            </div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ background: r.is_winner ? '#9BE36D' : 'rgba(238,240,244,0.45)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.value_cents / max }}
                transition={{ type: 'spring', duration: 0.6, bounce: 0, delay: i * 0.04 }}
              />
            </div>
          </li>
        ))}
      </ol>
    </Sheet>
  )
}
