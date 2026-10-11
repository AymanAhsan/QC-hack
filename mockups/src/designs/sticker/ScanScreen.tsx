import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckIcon, FireIcon, ReceiptIcon, TicketIcon } from '@phosphor-icons/react'
import { cardById, nikeStack, sampleCart, type Transaction } from '../../data/data'
import { SCAN_STAGE_LABEL, scanRanking, useScanFlow, type ScanStage } from '../../shared/derive'
import { celebrate } from '../../shared/confetti'
import { playChime, playTick } from '../../shared/feedback'
import { money } from '../../shared/format'
import { Money } from '../../shared/Money'
import { Sheet } from '../../shared/Sheet'
import type { DemoSession } from '../../shared/session'
import { handle, panel } from './sheets'
import { Box, Btn, CardArt, CARD_RATIO, FONT, Label, LinkBtn, MerchantMark, MONO, Row, Stamp, Tag, Title } from './ui'

const swap = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8, transition: { duration: 0.14 } } }
const springIn = { type: 'spring', duration: 0.45, bounce: 0 } as const
const CONFETTI = ['#111111', '#FF5B1F', '#FBF8F1', '#0E7A45']

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
    <div className="pb-36">
      <Title>Scan</Title>
      <AnimatePresence mode="wait" initial={false}>
        {flow.stage === 'idle' ? (
          <motion.div key="idle" {...swap} transition={springIn}>
            <Idle onFile={start} onSample={() => start()} />
          </motion.div>
        ) : flow.stage !== 'result' ? (
          <motion.div key="scanning" {...swap} transition={springIn}>
            <Scanning stage={flow.stage} image={image} />
          </motion.div>
        ) : (
          <motion.div key="result" {...swap} transition={springIn}>
            <Result fromUpload={!!image} session={session} logged={logged} onLogged={setLogged} onRestart={restart} onSeeRewards={onSeeRewards} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Idle({ onFile, onSample }: { onFile: (f: File) => void; onSample: () => void }) {
  return (
    <div className="px-4">
      <div className="rounded-[14px] border-2 border-dashed border-[#111] bg-[#FBF8F1] px-5 pb-5 pt-7">
        <span className="grid size-14 place-items-center rounded-[12px] border-2 border-[#111] bg-[#FF5B1F] shadow-[3px_3px_0_#111]">
          <ReceiptIcon size={28} weight="bold" />
        </span>
        <h2 className={`${FONT} pt-5 text-[30px] font-extrabold leading-[0.98] tracking-[-0.03em] [font-stretch:85%]`}>
          Drop in a screenshot of your cart
        </h2>
        <p className="max-w-[32ch] pt-3 text-[15px] font-semibold leading-[21px] text-[#4A4741]">
          We find the store and total, stack the best coupon, then pick the card that earns most on what's left.
        </p>
        <label className="mt-6 block cursor-pointer rounded-full focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-[#111]">
          <span className="flex h-[52px] w-full items-center justify-center rounded-full border-2 border-[#111] bg-[#FF5B1F] text-[17px] font-extrabold shadow-[3px_3px_0_#111] transition-[transform,box-shadow] duration-100 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
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
        <div className="pt-3">
          <Btn variant="secondary" onClick={onSample}>
            Try a sample cart
          </Btn>
        </div>
      </div>
      <p className="px-1 pt-3 text-[13px] font-semibold text-[#4A4741]">PNG, JPEG, or WEBP. Coupons are demo offers.</p>
    </div>
  )
}

const STAGES: Exclude<ScanStage, 'idle' | 'result'>[] = ['reading', 'coupons', 'cards']

function Scanning({ stage, image }: { stage: ScanStage; image: string | null }) {
  const at = STAGES.indexOf(stage as (typeof STAGES)[number])
  return (
    <div className="px-4">
      <div className="mx-auto w-[236px]">
        {/* the receipt prints line by line while we read it */}
        <div className="relative overflow-hidden border-2 border-b-0 border-[#111] bg-[#FBF8F1] px-4 pb-5 pt-4" style={{ borderRadius: '12px 12px 0 0' }}>
          {image ? (
            <img src={image} alt="Your cart screenshot" className="h-[210px] w-full rounded-[6px] object-cover" />
          ) : (
            <div className={`${MONO} space-y-2.5 text-[12px]`}>
              <div className="text-center text-[13px] font-bold tracking-[0.2em]">NIKE · CART</div>
              {sampleCart.items.map((it, i) => (
                <motion.div
                  key={it.name}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.16, duration: 0.2 }}
                  className="flex gap-2"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {it.qty}× {it.name.replace('Nike ', '')}
                  </span>
                  <span className="tabular-nums">{money(it.priceCents)}</span>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex border-t-2 border-dashed border-[#111] pt-2 font-bold">
                <span className="flex-1">SUBTOTAL</span>
                <span className="tabular-nums">{money(sampleCart.subtotalCents)}</span>
              </motion.div>
            </div>
          )}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ y: '0%' }}
            animate={{ y: '100%' }}
            transition={{ duration: 0.9, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
          >
            <div className="h-[3px] bg-[#FF5B1F] shadow-[0_0_0_1px_#111]" />
          </motion.div>
        </div>
        {/* torn edge */}
        <svg viewBox="0 0 236 10" width="236" height="10" className="block" aria-hidden>
          <path d="M0 0 L0 6 L9.8 10 L19.7 6 L29.5 10 L39.3 6 L49.2 10 L59 6 L68.8 10 L78.7 6 L88.5 10 L98.3 6 L108.2 10 L118 6 L127.8 10 L137.7 6 L147.5 10 L157.3 6 L167.2 10 L177 6 L186.8 10 L196.7 6 L206.5 10 L216.3 6 L226.2 10 L236 6 L236 0 Z" fill="#FBF8F1" />
          <path d="M1 0 L1 6 L9.8 9.6 L19.7 6 L29.5 9.6 L39.3 6 L49.2 9.6 L59 6 L68.8 9.6 L78.7 6 L88.5 9.6 L98.3 6 L108.2 9.6 L118 6 L127.8 9.6 L137.7 6 L147.5 9.6 L157.3 6 L167.2 9.6 L177 6 L186.8 9.6 L196.7 6 L206.5 9.6 L216.3 6 L226.2 9.6 L235 6 L235 0" fill="none" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
      <ul className="mx-auto mt-7 w-fit space-y-3" aria-live="polite">
        {STAGES.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-[17px] font-extrabold transition-opacity duration-200 ${i <= at ? 'opacity-100' : 'opacity-35'}`}>
            <span className={`grid size-7 place-items-center rounded-[7px] border-2 border-[#111] ${i < at ? 'bg-[#FF5B1F]' : 'bg-[#FBF8F1]'}`}>
              {i < at ? (
                <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.3, bounce: 0.5 }}>
                  <CheckIcon size={15} weight="bold" />
                </motion.span>
              ) : i === at ? (
                <span className="size-3 motion-safe:animate-spin rounded-[2px] border-2 border-[#111] border-t-transparent" />
              ) : null}
            </span>
            {SCAN_STAGE_LABEL[s]}
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

  return (
    <div className="space-y-7 px-4">
      <div className="flex items-center gap-3">
        <MerchantMark id={stack.merchant.id} name={stack.merchant.name} size={46} />
        <div className="min-w-0 flex-1">
          <div className={`${FONT} text-[24px] font-extrabold leading-none tracking-[-0.02em]`}>{stack.merchant.name}</div>
          <div className="pt-1 text-[14px] font-semibold text-[#4A4741]">{fromUpload ? 'The demo reads every screenshot as the sample cart' : `${sampleCart.items.length} items · ${money(stack.subtotal_cents)}`}</div>
        </div>
        <Tag>{fromUpload ? 'Demo' : 'Sample'}</Tag>
      </div>

      <div>
        <div className="text-[13px] font-extrabold uppercase tracking-[0.12em]">You get back</div>
        <div className={`${FONT} pt-1 text-[84px] font-extrabold leading-[0.9] tracking-[-0.045em] text-[#0E7A45] tabular-nums [font-stretch:80%]`}>
          <Money cents={stack.total_value_cents} />
        </div>
        <div className="pt-2 text-[16px] font-bold">
          {stack.total_value_pct.toFixed(1)}% of {money(stack.original_total_cents)}
        </div>
      </div>

      <Box raised>
        {stack.coupon ? (
          <Row
            first
            leading={
              <span className="grid size-10 place-items-center rounded-[10px] border-2 border-[#111] bg-[#FF5B1F]">
                <TicketIcon size={20} weight="bold" />
              </span>
            }
            title={<span className={`${MONO} rounded-[5px] border-2 border-dashed border-[#111] px-1.5 text-[15px] font-bold tracking-[0.06em]`}>{stack.coupon.coupon.code}</span>}
            subtitle={stack.coupon.coupon.description}
            trailing={<span className="text-[17px] font-extrabold tabular-nums text-[#0E7A45]">−{money(stack.coupon.savings_cents)}</span>}
          />
        ) : null}
        <Row
          leading={
            <span className="flex size-10 items-center justify-center">
              <span className="block w-[25px] shadow-[2px_2px_0_#111]" style={{ height: 25 * CARD_RATIO, borderRadius: 3 }}>
                <CardArt card={best} width={25} />
              </span>
            </span>
          }
          title={best.name}
          subtitle={`3% at Nike on ${money(stack.charge_cents)}`}
          trailing={<span className="text-[17px] font-extrabold tabular-nums text-[#0E7A45]">+{money(bestEval.value_cents)}</span>}
        />
        <Row title={<span className="underline decoration-2 underline-offset-4">Why this stack</span>} onClick={() => setWhy(true)} />
      </Box>

      <div>
        <Label>The cart</Label>
        <Box className={`${MONO} px-4 py-3 text-[13px]`}>
          {sampleCart.items.map((it) => (
            <div key={it.name} className="flex items-baseline gap-2 py-1">
              <span className="min-w-0 flex-1">
                {it.qty}× {it.name}
              </span>
              <span className="tabular-nums">{money(it.priceCents)}</span>
            </div>
          ))}
          <div className="mt-1.5 flex border-t-2 border-dashed border-[#111] pt-2 font-bold">
            <span className="flex-1">Subtotal</span>
            <span className="tabular-nums">{money(sampleCart.subtotalCents)}</span>
          </div>
        </Box>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {logged ? (
          <motion.div key="logged" {...swap} transition={springIn}>
            <Logged tx={logged} streak={session.stats.streak} onSeeRewards={onSeeRewards} onRestart={onRestart} />
          </motion.div>
        ) : (
          <motion.div key="log" {...swap} transition={springIn}>
            <LogPurchase
              bestId={best.id}
              onLog={(cardId) => {
                const tx = session.logScan(cardId)
                playChime()
                if (tx.missed_cents === 0) celebrate({ colors: CONFETTI, shapes: ['square'], origin: { x: 0.5, y: 0.7 }, scalar: 1.1 })
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
    <Box className="p-4" raised>
      <p className={`${FONT} text-[24px] font-extrabold leading-[1.05] tracking-[-0.02em]`}>Paid with {cardById[bestId].name}?</p>
      <AnimatePresence initial={false}>
        {choosing ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
            className="overflow-hidden"
          >
            <div role="radiogroup" aria-label="Card used" className="mt-3 overflow-hidden rounded-[12px] border-2 border-[#111]">
              {ranking.map((r, i) => {
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
                    className={`flex h-[52px] w-full items-center gap-3 px-3 text-left transition-colors duration-150 ${i ? 'border-t border-[#111]' : ''} ${on ? 'bg-[#FF5B1F]' : 'bg-[#FBF8F1]'} focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#111]`}
                  >
                    <span className="block w-[18px]" style={{ height: 18 * CARD_RATIO }}>
                      <CardArt card={r.card} width={18} />
                    </span>
                    <span className="flex-1 text-[16px] font-bold">{r.card.name}</span>
                    <span className="text-[15px] font-bold tabular-nums">+{money(r.value_cents)}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="pt-4">
        <Btn onClick={() => onLog(picked)}>{picked === bestId ? 'Log purchase' : `Log with ${cardById[picked]?.name}`}</Btn>
      </div>
      {!choosing ? (
        <div className="flex justify-center pt-1.5">
          <LinkBtn onClick={() => setChoosing(true)}>I used a different card</LinkBtn>
        </div>
      ) : null}
      <p className="pt-2 text-center text-[13px] font-semibold text-[#4A4741]">Simulated purchase · nothing is charged</p>
    </Box>
  )
}

function Logged({ tx, streak, onSeeRewards, onRestart }: { tx: Transaction; streak: number; onSeeRewards: () => void; onRestart: () => void }) {
  const maxed = tx.missed_cents === 0
  return (
    <Box className="px-5 pb-4 pt-7 text-center" raised>
      <Stamp kind={maxed ? 'maxed' : 'paid'} size="lg" />
      <p className={`${FONT} pt-5 text-[28px] font-extrabold leading-none tracking-[-0.02em] tabular-nums`}>
        {maxed ? `+${money(tx.earned_cents)} back` : `${money(tx.missed_cents)} missed`}
      </p>
      <p className="mx-auto max-w-[30ch] pt-2 text-[15px] font-semibold text-[#4A4741]">
        {maxed ? 'Best coupon, best card. Nothing left on the table.' : `${cardById[tx.best_card_id ?? '']?.name} would have earned ${money(tx.best_possible_cents)}.`}
      </p>
      {maxed && streak > 0 ? (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border-2 border-[#111] bg-[#FF5B1F] px-3 py-1.5 text-[14px] font-extrabold">
          <FireIcon size={16} weight="fill" /> {streak} best-card {streak === 1 ? 'pick' : 'picks'} in a row
        </span>
      ) : null}
      <div className="pt-5">
        <Btn onClick={onSeeRewards}>See Rewards</Btn>
      </div>
      <div className="flex justify-center pt-1">
        <LinkBtn onClick={onRestart}>Scan another cart</LinkBtn>
      </div>
    </Box>
  )
}

function WhyStackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const stack = nikeStack
  const ranking = scanRanking()
  const max = Math.max(...ranking.map((r) => r.value_cents), 1)
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Why this stack" hideTitle panelClassName={panel} handleClassName={handle}>
      <div className={`${FONT} pb-4 pt-2 text-[28px] font-extrabold leading-none tracking-[-0.03em] [font-stretch:85%]`}>Why this stack</div>
      <Label>Coupons checked</Label>
      <Box>
        {stack.coupons_considered.map((c, i) => {
          const used = c.coupon.code === stack.coupon?.coupon.code
          return (
            <Row
              key={c.coupon.code}
              first={i === 0}
              title={<span className={`${MONO} font-bold`}>{c.coupon.code}</span>}
              subtitle={c.eligible ? c.coupon.description : c.reason}
              trailing={
                used ? (
                  <span className="text-[16px] font-extrabold tabular-nums text-[#0E7A45]">−{money(c.savings_cents)}</span>
                ) : (
                  <span className="text-[14px] font-bold tabular-nums text-[#4A4741]">{c.eligible ? `−${money(c.savings_cents)}` : 'Not eligible'}</span>
                )
              }
            />
          )
        })}
      </Box>
      <Label className="pt-6">Cards on {money(stack.charge_cents)}</Label>
      <Box className="space-y-3.5 p-3.5">
        {ranking.map((r) => (
          <div key={r.card_id}>
            <div className="flex justify-between text-[15px] font-bold">
              <span>{r.card.name}</span>
              <span className="tabular-nums">{money(r.value_cents)}</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-[#111] bg-[#FBF8F1]">
              <motion.div
                className="h-full origin-left"
                style={{ background: r.is_winner ? '#0E7A45' : '#111' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.value_cents / max }}
                transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
              />
            </div>
          </div>
        ))}
      </Box>
    </Sheet>
  )
}
