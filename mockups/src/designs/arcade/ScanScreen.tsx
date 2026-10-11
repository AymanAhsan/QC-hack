import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDownIcon, CheckIcon, FireIcon, PlusIcon, ReceiptIcon, TicketIcon } from '@phosphor-icons/react'
import { cardById, nikeStack, sampleCart, type Transaction } from '../../data/data'
import { SCAN_STAGE_LABEL, scanRanking, useScanFlow, type ScanStage } from '../../shared/derive'
import { celebrate } from '../../shared/confetti'
import { playChime, playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Money } from '../../shared/Money'
import type { DemoSession } from '../../shared/session'
import { Hud } from './Hud'
import { WhyStackSheet } from './sheets'
import { A, CardArt, MerchantMark, Push, PushEdge, Row, SectionTitle, Tile, cardEdge, calmSpring } from './ui'

const swap = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8, transition: { duration: 0.15 } } }

export function ScanScreen({ session, onRewards }: { session: DemoSession; onRewards: () => void }) {
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
    <div className="pb-36">
      <Hud session={session} title="Scan" onRewards={onRewards} />
      <AnimatePresence mode="wait" initial={false}>
        {flow.stage === 'idle' ? (
          <motion.div key="idle" {...swap} transition={calmSpring}>
            <Idle onFile={start} onSample={() => start()} />
          </motion.div>
        ) : flow.stage !== 'result' ? (
          <motion.div key="scanning" {...swap} transition={calmSpring}>
            <Scanning stage={flow.stage} image={image} />
          </motion.div>
        ) : (
          <motion.div key="result" {...swap} transition={calmSpring}>
            <Result fromUpload={!!image} session={session} logged={logged} onLogged={setLogged} onRestart={restart} onRewards={onRewards} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Idle({ onFile, onSample }: { onFile: (f: File) => void; onSample: () => void }) {
  return (
    <div className="px-4 pt-1">
      <Tile className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
        <span className="grid size-[76px] place-items-center rounded-[24px] bg-[#1FCB82] shadow-[0_6px_0_#12935C]">
          <ReceiptIcon size={42} weight="bold" className="text-[#1F1F1F]" />
        </span>
        <h2 className="pt-6 text-[26px] font-black leading-tight tracking-[-0.4px]">Scan a cart</h2>
        <p className="max-w-[29ch] pt-2 text-[16px] font-semibold leading-[22px] text-[#6B6257]">
          Screenshot your online cart. We find the best coupon and the card that pays you most.
        </p>
        <label
          className="push group relative block w-full cursor-pointer rounded-[18px] outline-offset-4 focus-within:outline-[3px] focus-within:outline-[#1F1F1F]"
          style={{ marginTop: 28, ['--d' as string]: '5px' }}
        >
          <PushEdge color={A.jadeEdge} radius={18} />
          <span className="push-face flex h-14 w-full items-center justify-center rounded-[18px] text-[18px] font-black" style={{ background: A.jade }}>
            Choose screenshot
          </span>
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
        <Push tone="soft" className="mt-3 w-full" faceClassName="h-14 text-[18px] font-extrabold" onClick={onSample}>
          Try a sample cart
        </Push>
      </Tile>
      <p className="px-4 pt-4 text-center text-[13px] font-bold text-[#8A8075]">PNG, JPEG, or WEBP · coupons are demo offers</p>
    </div>
  )
}

const STAGES: Exclude<ScanStage, 'idle' | 'result'>[] = ['reading', 'coupons', 'cards']

function Scanning({ stage, image }: { stage: ScanStage; image: string | null }) {
  const at = STAGES.indexOf(stage as (typeof STAGES)[number])
  return (
    <div className="px-4 pt-1">
      <Tile className="px-5 pb-6 pt-5">
        <div className="relative mx-auto h-[220px] w-[150px] overflow-hidden rounded-[18px] bg-[#F4EADB]">
          {image ? (
            <img src={image} alt="Your cart screenshot" className="h-full w-full object-cover" />
          ) : (
            <div className="space-y-2.5 p-3.5">
              <div className="h-2.5 w-12 rounded-full bg-[#D9CCB6]" />
              {sampleCart.items.map((it) => (
                <div key={it.name} className="flex gap-2">
                  <div className="size-8 shrink-0 rounded-[8px] bg-white" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-2 rounded-full bg-[#E6D9C4]" />
                    <div className="h-2 w-2/3 rounded-full bg-[#EDE2D0]" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <motion.div
            aria-hidden
            className="absolute inset-x-0 h-2 rounded-full bg-[#1FCB82]"
            initial={{ y: -8 }}
            animate={{ y: 228 }}
            transition={{ duration: 0.9, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
          />
        </div>
        <div className="mt-6 flex gap-2" aria-hidden>
          {STAGES.map((s, i) => (
            <div key={s} className="h-3.5 flex-1 overflow-hidden rounded-full bg-[#F4EADB]">
              <motion.div
                className="h-full origin-left rounded-full bg-[#1FCB82]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: i < at ? 1 : i === at ? 0.6 : 0 }}
                transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
              />
            </div>
          ))}
        </div>
        <ul className="mt-5 space-y-2.5" aria-live="polite">
          {STAGES.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 text-[17px] font-extrabold ${i <= at ? 'text-[#1F1F1F]' : 'text-[#C9BCA8]'}`}>
              <span className={`grid size-7 place-items-center rounded-full ${i < at ? 'bg-[#1FCB82]' : i === at ? 'bg-[#F4EADB]' : 'bg-[#F7EFE3]'}`}>
                {i < at ? (
                  <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.35, bounce: 0.5 }}>
                    <CheckIcon size={16} weight="bold" />
                  </motion.span>
                ) : i === at ? (
                  <span className="size-3.5 motion-safe:animate-spin rounded-full border-[3px] border-[#D9CCB6] border-t-[#1F1F1F]" />
                ) : null}
              </span>
              {SCAN_STAGE_LABEL[s]}
            </li>
          ))}
        </ul>
      </Tile>
    </div>
  )
}

function Result({
  fromUpload,
  session,
  logged,
  onLogged,
  onRestart,
  onRewards,
}: {
  fromUpload: boolean
  session: DemoSession
  logged: Transaction | null
  onLogged: (t: Transaction) => void
  onRestart: () => void
  onRewards: () => void
}) {
  const stack = nikeStack
  const best = cardById[stack.winner_card_id ?? 'apple-card']
  const bestEval = stack.ranking.find((r) => r.is_winner)!
  const [why, setWhy] = useState(false)
  const [items, setItems] = useState(false)

  return (
    <div className="space-y-6 px-4">
      <div className="flex items-center gap-3">
        <MerchantMark id={stack.merchant.id} name={stack.merchant.name} size={46} />
        <div className="min-w-0">
          <div className="text-[21px] font-black leading-tight">{stack.merchant.name}</div>
          <div className="text-[14px] font-bold text-[#6B6257]">{fromUpload ? 'Demo reads every screenshot as the sample cart' : 'Sample cart'}</div>
        </div>
      </div>

      <Tile face="#E3F7EC" edge="#B9E8CF" className="px-5 pb-5 pt-5 text-center">
        <div className="text-[15px] font-extrabold uppercase tracking-[1px] text-[#0B7D4D]">You get back</div>
        <div className="text-[60px] font-black leading-[66px] tracking-[-1.5px] text-[#0B7D4D]">
          <Money cents={stack.total_value_cents} />
        </div>
        <div className="text-[15px] font-bold text-[#3E6B55]">
          {stack.total_value_pct.toFixed(1)}% of {money(stack.original_total_cents)}
        </div>
      </Tile>

      <div>
        <SectionTitle right={<Push depth={3} radius={12} onClick={() => setWhy(true)} faceClassName="h-9 px-3 text-[14px] font-black">Why this stack</Push>}>
          Your combo
        </SectionTitle>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {stack.coupon ? (
            <Tile radius={20} className="h-full p-3.5">
              <span className="grid size-10 place-items-center rounded-[13px] bg-[#FF9A2E] shadow-[0_3px_0_#D66F00]">
                <TicketIcon size={22} weight="fill" />
              </span>
              <div className="pt-3 text-[17px] font-black tracking-[1px]">{stack.coupon.coupon.code}</div>
              <div className="text-[13px] font-bold leading-[17px] text-[#6B6257]">{stack.coupon.coupon.description}</div>
              <div className="pt-2 text-[19px] font-black tabular-nums text-[#0B7D4D]">−{money(stack.coupon.savings_cents)}</div>
            </Tile>
          ) : null}
          <span className="grid size-8 place-items-center rounded-full bg-[#1F1F1F] text-white">
            <PlusIcon size={16} weight="bold" />
          </span>
          <Tile radius={20} className="h-full p-3.5">
            <span className="block h-10 w-[63px] overflow-hidden rounded-[9px]" style={{ boxShadow: `0 3px 0 ${cardEdge(best)}, 0 0 0 1px rgba(0,0,0,0.06)` }}>
              <CardArt card={best} bare />
            </span>
            <div className="pt-3 text-[17px] font-black">{best.name}</div>
            <div className="text-[13px] font-bold leading-[17px] text-[#6B6257]">3% at Nike on {money(stack.charge_cents)}</div>
            <div className="pt-2 text-[19px] font-black tabular-nums text-[#0B7D4D]">+{money(bestEval.value_cents)}</div>
          </Tile>
        </div>
      </div>

      <Tile>
        <button type="button" onClick={() => setItems((o) => !o)} aria-expanded={items} className="flex min-h-[56px] w-full items-center gap-3 rounded-[24px] px-4 text-left active:bg-[#FBF5EC]">
          <span className="flex-1 text-[17px] font-extrabold">{sampleCart.items.length} items</span>
          <span className="text-[17px] font-black tabular-nums">{money(sampleCart.subtotalCents)}</span>
          <motion.span animate={{ rotate: items ? 180 : 0 }} transition={calmSpring}>
            <CaretDownIcon size={18} weight="bold" className="text-[#A79C8E]" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {items ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={calmSpring} className="overflow-hidden border-t-2 border-[#F4EADB]">
              {sampleCart.items.map((it, i) => (
                <Row
                  key={it.name}
                  title={<span className="whitespace-normal text-[15px]">{it.name}</span>}
                  subtitle={it.qty > 1 ? `Qty ${it.qty}` : undefined}
                  trailing={<span className="text-[15px] font-black tabular-nums">{money(it.priceCents)}</span>}
                  last={i === sampleCart.items.length - 1}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Tile>

      <AnimatePresence mode="wait" initial={false}>
        {logged ? (
          <motion.div key="logged" {...swap} transition={calmSpring}>
            <Logged tx={logged} streak={session.stats.streak} onRewards={onRewards} onRestart={onRestart} />
          </motion.div>
        ) : (
          <motion.div key="log" {...swap} transition={calmSpring}>
            <LogPurchase
              bestId={best.id}
              onLog={(cardId) => {
                const tx = session.logScan(cardId)
                playChime()
                if (tx.missed_cents === 0) celebrate({ colors: [A.jade, A.flame, '#FFC93C'], origin: { x: 0.5, y: 0.7 }, scalar: 1.2 })
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
    <Tile className="p-5">
      <p className="text-center text-[21px] font-black">Paid with {cardById[bestId].name}?</p>
      <AnimatePresence initial={false}>
        {choosing ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={calmSpring} className="-mx-1 overflow-hidden">
            <div role="radiogroup" aria-label="Card used" className="space-y-2.5 px-1 pb-1 pt-4">
              {ranking.map((r) => {
                const on = picked === r.card_id
                return (
                  <Push
                    key={r.card_id}
                    role="radio"
                    aria-checked={on}
                    tone={on ? 'jade' : 'soft'}
                    depth={4}
                    radius={16}
                    className="w-full"
                    faceClassName="justify-start gap-3 px-3 py-2 text-left"
                    onClick={() => {
                      playTick()
                      setPicked(r.card_id)
                    }}
                  >
                    <span className="block h-[26px] w-[40px] shrink-0 overflow-hidden rounded-[6px]">
                      <CardArt card={r.card} bare />
                    </span>
                    <span className="flex-1 text-[16px] font-extrabold">{r.card.name}</span>
                    <span className="text-[15px] font-black tabular-nums">+{money(r.value_cents)}</span>
                  </Push>
                )
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Push tone="jade" className="mt-5 w-full" faceClassName="h-14 text-[18px] font-black" onClick={() => onLog(picked)}>
        {picked === bestId ? 'Log purchase' : `Log with ${cardById[picked].name}`}
      </Push>
      {!choosing ? (
        <Push tone="soft" className="mt-3 w-full" faceClassName="h-12 text-[16px] font-extrabold" onClick={() => setChoosing(true)}>
          I used a different card
        </Push>
      ) : null}
      <p className="pt-3 text-center text-[13px] font-bold text-[#8A8075]">Simulated purchase · nothing is charged</p>
    </Tile>
  )
}

function Logged({ tx, streak, onRewards, onRestart }: { tx: Transaction; streak: number; onRewards: () => void; onRestart: () => void }) {
  const maxed = tx.missed_cents === 0
  return (
    <Tile className="flex flex-col items-center px-5 pb-5 pt-7 text-center">
      <motion.span
        className={`grid size-16 place-items-center rounded-full ${maxed ? 'bg-[#1FCB82] shadow-[0_5px_0_#12935C]' : 'bg-[#F4EADB] shadow-[0_5px_0_#EADFCC]'}`}
        initial={{ scale: 0.3, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.55, bounce: 0.5 }}
      >
        <CheckIcon size={34} weight="bold" />
      </motion.span>
      <p className={`pt-4 text-[26px] font-black ${maxed ? 'uppercase tracking-[0.3px]' : 'tracking-[-0.3px]'}`}>{maxed ? 'Maximized!' : 'Logged'}</p>
      <p className="text-balance pt-1 text-[16px] font-bold leading-snug text-[#6B6257]">
        {maxed ? `+${money(tx.earned_cents)} back, nothing left on the table` : `${cardById[tx.best_card_id ?? '']?.name} would've earned ${money(tx.missed_cents)} more`}
      </p>
      {maxed && streak > 0 ? (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#FFEBD3] px-3.5 py-1.5 text-[15px] font-black text-[#B35400]">
          <FireIcon size={17} weight="fill" className="text-[#FF9A2E]" /> {streak} best-card {streak === 1 ? 'pick' : 'picks'} in a row
        </span>
      ) : null}
      <Push tone="jade" className="mt-6 w-full" faceClassName="h-14 text-[18px] font-black" onClick={onRewards}>
        See Rewards
      </Push>
      <Push tone="soft" className="mt-3 w-full" faceClassName="h-12 text-[16px] font-extrabold" onClick={onRestart}>
        Scan another cart
      </Push>
    </Tile>
  )
}
