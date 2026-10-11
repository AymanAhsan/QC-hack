import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Menu } from '@base-ui/react/menu'
import { CaretDownIcon, CaretLeftIcon, CheckIcon, DotsThreeIcon, FireIcon, MapPinIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import type { Card, Transaction } from '../../data/data'
import { celebrate } from '../../shared/confetti'
import { playChime, playFanfare } from '../../shared/feedback'
import { money, relativeDay } from '../../shared/format'
import { standing } from '../../shared/derive'
import { useFrame } from '../../shared/frame'
import type { DemoSession } from '../../shared/session'
import { Hud } from './Hud'
import { PayButton } from './PayButton'
import { AddCardSheet, CardDetailsSheet, ConfirmRemoveSheet, StoreSheet, WhySheet } from './sheets'
import { A, CardArt, MerchantMark, Push, PushEdge, Row, SectionTitle, Tile, cardEdge, calmSpring, popSpring } from './ui'

const RATIO = 214 / 340
const STRIP = 64
const EDGE = 7
type SheetName = 'store' | 'why' | 'add' | 'details' | 'remove' | null
type Moment = { key: number; tx: Transaction; streak: number; bestName: string | null }

export function WalletScreen({ session, width, onRewards }: { session: DemoSession; width: number; onRewards: () => void }) {
  const cardW = width - 32
  const cardH = Math.round(cardW * RATIO)
  const [presented, setPresented] = useState<string | null>(session.winnerCardId)
  const [sheet, setSheet] = useState<SheetName>(null)
  const [moment, setMoment] = useState<Moment | null>(null)

  useEffect(() => {
    setPresented(session.winnerCardId)
  }, [session.storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!moment) return
    const t = setTimeout(() => setMoment(null), 2000)
    return () => clearTimeout(t)
  }, [moment])

  const card = session.cards.find((c) => c.id === presented) ?? null

  const pay = () => {
    if (!card) return
    const tx = session.payInStore(card.id)
    if (!tx) return
    const maxed = tx.missed_cents === 0
    const streak = maxed ? session.stats.streak + 1 : 0
    const milestone = maxed && [3, 5, 10].includes(streak)
    playChime()
    if (milestone) setTimeout(playFanfare, 300)
    if (maxed) celebrate({ colors: [A.jade, A.flame, '#FFC93C', card.gradient[0]], origin: { x: 0.5, y: 0.38 }, size: milestone ? 'big' : 'small', scalar: 1.2 })
    const best = session.rec?.ranking.find((r) => r.is_winner)
    setMoment({ key: Date.now(), tx, streak, bestName: best?.card_name ?? null })
  }

  return (
    <LayoutGroup>
      <div className="pb-36">
        <Hud
          session={session}
          title="Wallet"
          onRewards={onRewards}
          left={
            card ? (
              <Push depth={3} radius={14} onClick={() => setPresented(null)} faceClassName="h-[41px] gap-1 pl-2 pr-3.5 text-[16px] font-black">
                <CaretLeftIcon size={18} weight="bold" /> Cards
              </Push>
            ) : undefined
          }
          action={
            card ? (
              <CardMenu onDetails={() => setSheet('details')} onRemove={() => setSheet('remove')} />
            ) : (
              <Push tone="jade" depth={3} radius={14} aria-label="Add card" onClick={() => setSheet('add')} faceClassName="size-[41px]">
                <PlusIcon size={22} weight="bold" />
              </Push>
            )
          }
        />

        <StoreChip session={session} onOpen={() => setSheet('store')} />

        {card ? (
          <Detail
            card={card}
            cardW={cardW}
            cardH={cardH}
            session={session}
            moment={moment}
            onPay={pay}
            onWhy={() => setSheet('why')}
            onPick={() => setSheet('store')}
            onPresent={setPresented}
          />
        ) : (
          <Deck cardH={cardH} session={session} onPresent={setPresented} onAdd={() => setSheet('add')} />
        )}
      </div>

      <StoreSheet
        open={sheet === 'store'}
        onOpenChange={(o) => setSheet(o ? 'store' : null)}
        storeId={session.storeId}
        onPick={(id) => {
          session.setStoreId(id)
          setSheet(null)
        }}
      />
      <WhySheet open={sheet === 'why'} onOpenChange={(o) => setSheet(o ? 'why' : null)} rec={session.rec} />
      <AddCardSheet
        open={sheet === 'add'}
        onOpenChange={(o) => setSheet(o ? 'add' : null)}
        onAdd={(type, last4) => {
          const c = session.addCard(type, last4)
          setTimeout(() => setPresented(c.id), 350)
        }}
      />
      <CardDetailsSheet open={sheet === 'details'} onOpenChange={(o) => setSheet(o ? 'details' : null)} card={card} />
      <ConfirmRemoveSheet
        open={sheet === 'remove'}
        onOpenChange={(o) => setSheet(o ? 'remove' : null)}
        card={card}
        onRemove={() => {
          if (card) session.removeCard(card.id)
          setPresented(null)
          setSheet(null)
        }}
      />
    </LayoutGroup>
  )
}

function StoreChip({ session, onOpen }: { session: DemoSession; onOpen: () => void }) {
  const { store, rec } = session
  return (
    <div className="flex items-stretch gap-2.5 px-4 pb-5">
      <Push depth={4} radius={18} className="min-w-0 flex-1" faceClassName="h-[52px] justify-start gap-2.5 pl-2 pr-3 text-left" onClick={onOpen}>
        <span className={`grid size-9 shrink-0 place-items-center rounded-[12px] ${store ? 'bg-[#1FCB82] shadow-[0_2px_0_#12935C]' : 'bg-[#F4EADB]'}`}>
          <MapPinIcon size={20} weight="fill" className={store ? 'text-[#1F1F1F]' : 'text-[#A79C8E]'} />
        </span>
        {store && rec ? (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[17px] font-black">{store.merchant.name}</span>
            <span className="block text-[13px] font-bold text-[#6B6257]">Checkout {money(rec.amount_cents)}</span>
          </span>
        ) : (
          <span className="flex-1 truncate text-[17px] font-extrabold text-[#6B6257]">Where are you shopping?</span>
        )}
        <CaretDownIcon size={18} weight="bold" className="shrink-0 text-[#A79C8E]" />
      </Push>
      {store ? (
        <Push depth={4} radius={18} aria-label="Leave store" onClick={() => session.setStoreId(null)} faceClassName="size-[52px]">
          <XIcon size={20} weight="bold" />
        </Push>
      ) : null}
    </div>
  )
}

function Deck({ cardH, session, onPresent, onAdd }: { cardH: number; session: DemoSession; onPresent: (id: string) => void; onAdd: () => void }) {
  const cards = session.cards
  if (!cards.length) {
    return (
      <div className="px-4">
        <Tile className="flex flex-col items-center px-6 py-10 text-center">
          <p className="text-[20px] font-black">No cards yet</p>
          <p className="max-w-[28ch] pt-1 text-[15px] font-semibold text-[#6B6257]">Add the cards you carry and we'll pick the winner at every store.</p>
          <Push tone="jade" className="mt-6" faceClassName="h-12 px-6 text-[17px] font-black" onClick={onAdd}>
            Add a card
          </Push>
        </Tile>
      </div>
    )
  }
  return (
    <div className="relative mx-4" style={{ height: (cards.length - 1) * STRIP + cardH + EDGE }}>
      {cards.map((c, i) => {
        const ev = session.evaluation(c.id)
        const best = session.winnerCardId === c.id
        return (
          <motion.button
            key={c.id}
            layoutId={`a-card-${c.id}`}
            type="button"
            onClick={() => onPresent(c.id)}
            whileTap={{ scale: 0.98 }}
            transition={popSpring}
            aria-label={`${c.name} ending ${c.last4}${ev ? (ev.accepted ? `, earns ${money(ev.value_cents)} here` : ', not accepted here') : ''}`}
            className="absolute inset-x-0 overflow-hidden outline-offset-4 focus-visible:outline-[3px] focus-visible:outline-[#1F1F1F]"
            style={{ top: i * STRIP, height: cardH, zIndex: i, borderRadius: 22, boxShadow: `0 ${EDGE}px 0 ${cardEdge(c)}, 0 -2px 0 rgba(255,247,236,0.9)` }}
          >
            <CardArt
              card={c}
              corner={
                ev ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[14px] font-black tabular-nums ${
                      ev.accepted ? (best ? 'bg-[#1FCB82] text-[#1F1F1F] shadow-[0_2px_0_#12935C]' : 'bg-white/90 text-[#1F1F1F]') : 'bg-black/35 text-white line-through'
                    }`}
                  >
                    {ev.accepted ? `+${money(ev.value_cents)}` : 'Not accepted'}
                  </span>
                ) : undefined
              }
            />
          </motion.button>
        )
      })}
    </div>
  )
}

function Detail({
  card,
  cardW,
  cardH,
  session,
  moment,
  onPay,
  onWhy,
  onPick,
  onPresent,
}: {
  card: Card
  cardW: number
  cardH: number
  session: DemoSession
  moment: Moment | null
  onPay: () => void
  onWhy: () => void
  onPick: () => void
  onPresent: (id: string) => void
}) {
  const ev = session.evaluation(card.id)
  const st = standing(session.rec, ev)
  const txs = useMemo(() => session.historyFor(card.id).slice(0, 10), [session, card.id])
  const others = session.cards.filter((c) => c.id !== card.id)
  const canPay = st.kind === 'best' || st.kind === 'behind'

  return (
    <div>
      <div className="relative mx-4" style={{ height: cardH + EDGE }}>
        <motion.div
          layoutId={`a-card-${card.id}`}
          transition={popSpring}
          className="absolute inset-x-0 top-0 overflow-hidden"
          style={{ height: cardH, borderRadius: 22, boxShadow: `0 ${EDGE}px 0 ${cardEdge(card)}` }}
        >
          <CardArt card={card} />
        </motion.div>
        {st.kind === 'best' ? (
          <motion.span
            initial={{ scale: 0.6, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.45, delay: 0.25 }}
            className="absolute -bottom-3 left-1/2 z-10 rounded-full bg-[#1FCB82] px-3.5 py-1.5 text-[14px] font-black uppercase tracking-[0.8px] text-[#1F1F1F] shadow-[0_3px_0_#12935C]"
            style={{ x: '-50%' }}
          >
            <span className="flex items-center gap-1">
              <CheckIcon size={15} weight="bold" /> Best pick here
            </span>
          </motion.span>
        ) : null}
        <AnimatePresence>{moment ? <MomentBadge key={moment.key} moment={moment} /> : null}</AnimatePresence>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...calmSpring, delay: 0.1 }}>
        <Status st={st} storeName={session.store?.merchant.name} accepts={session.rec?.merchant.accepts ?? []} onWhy={onWhy} onPick={onPick} onUseBest={() => session.winnerCardId && onPresent(session.winnerCardId)} />

        {canPay ? (
          <div className="pb-6 pt-1">
            <PayButton key={card.id} cardName={card.name} onPaid={onPay} />
          </div>
        ) : null}

        {others.length ? (
          <section className="pb-6">
            <div className="px-5">
              <SectionTitle>{session.store ? 'Other cards here' : 'Your other cards'}</SectionTitle>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none]">
              {others.map((c) => {
                const e = session.evaluation(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPresent(c.id)}
                    aria-label={`Show ${c.name}${e ? (e.accepted ? `, earns ${money(e.value_cents)} here` : ', not accepted here') : ''}`}
                    className="group shrink-0 text-left outline-offset-4 focus-visible:outline-[3px] focus-visible:outline-[#1F1F1F]"
                    style={{ width: Math.round(cardW * 0.36) }}
                  >
                    <span
                      className="block aspect-[340/214] overflow-hidden rounded-[12px] transition-transform duration-150 group-active:translate-y-[3px]"
                      style={{ boxShadow: `0 4px 0 ${cardEdge(c)}` }}
                    >
                      <CardArt card={c} mini />
                    </span>
                    <span className={`block pt-2 text-[15px] font-black tabular-nums ${e && !e.accepted ? 'text-[#A79C8E] line-through' : e?.is_winner ? 'text-[#0B7D4D]' : ''}`}>
                      {e ? (e.accepted ? `+${money(e.value_cents)}` : 'Not accepted') : c.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="px-4">
          <SectionTitle>Latest transactions</SectionTitle>
          <Tile>
            {txs.length ? (
              txs.map((t, i) => (
                <motion.div key={t.id} layout="position" initial={t.id.startsWith('session') ? { opacity: 0, y: -10 } : false} animate={{ opacity: 1, y: 0 }} transition={calmSpring}>
                  <Row
                    leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} />}
                    title={t.merchant_name}
                    subtitle={`${relativeDay(t.ts)} · ${t.channel === 'store' ? 'In store' : 'Online'}`}
                    trailing={
                      <div className="tabular-nums">
                        <div className="text-[17px] font-black">{money(t.amount_cents)}</div>
                        <div className={`text-[13px] font-extrabold ${t.missed_cents ? 'text-[#8A8075]' : 'text-[#0B7D4D]'}`}>
                          {t.missed_cents ? `${money(t.missed_cents)} missed` : `+${money(t.earned_cents)}`}
                        </div>
                      </div>
                    }
                    last={i === txs.length - 1}
                  />
                </motion.div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-[17px] font-black">No purchases yet</p>
                <p className="pt-1 text-[15px] font-semibold text-[#6B6257]">Payments with {card.name} land here.</p>
              </div>
            )}
          </Tile>
        </section>
      </motion.div>
    </div>
  )
}

function Status({
  st,
  storeName,
  accepts,
  onWhy,
  onPick,
  onUseBest,
}: {
  st: ReturnType<typeof standing>
  storeName?: string
  accepts: string[]
  onWhy: () => void
  onPick: () => void
  onUseBest: () => void
}) {
  const wrap = 'flex flex-col items-center px-6 pb-4 pt-6 text-center'
  if (st.kind === 'no-store')
    return (
      <div className={wrap}>
        <p className="text-balance text-[17px] font-extrabold leading-snug">Pick a store to see what this card earns</p>
        <Push className="mt-3" depth={4} faceClassName="h-11 gap-1.5 px-4 text-[16px] font-black" onClick={onPick}>
          <MapPinIcon size={18} weight="fill" /> Choose a store
        </Push>
      </div>
    )
  if (st.kind === 'rejected')
    return (
      <div className={wrap}>
        <p className="text-balance text-[20px] font-black leading-tight">Not accepted at {storeName}</p>
        <p className="pt-0.5 text-[15px] font-bold text-[#6B6257]">{storeName} takes {accepts.map((n) => (n === 'mastercard' ? 'Mastercard' : n === 'amex' ? 'Amex' : 'Visa')).join(' and ')} only</p>
        <Push tone="jade" className="mt-4" depth={5} faceClassName="h-12 px-5 text-[17px] font-black" onClick={onUseBest}>
          Use the best card
        </Push>
      </div>
    )
  if (st.kind === 'behind')
    return (
      <div className={wrap}>
        <p className="text-balance text-[19px] font-black leading-tight">
          {st.bestName} earns <span className="tabular-nums text-[#0B7D4D]">{money(st.behindBy)}</span> more here
        </p>
        <p className="pt-0.5 text-[15px] font-bold text-[#6B6257]">This card: +{money(st.value)} · {st.short}</p>
        <Push className="mt-3" depth={4} faceClassName="h-11 px-4 text-[16px] font-black" onClick={onUseBest}>
          Switch to {st.bestName}
        </Push>
      </div>
    )
  return (
    <div className={wrap}>
      <p className="text-[28px] font-black leading-none tracking-[-0.5px] tabular-nums text-[#0B7D4D]">+{money(st.value)} back</p>
      <div className="flex items-center gap-2 pt-2">
        <span className="text-[15px] font-bold text-[#6B6257]">{st.short}</span>
        <Push depth={3} radius={12} onClick={onWhy} faceClassName="h-8 px-3 text-[14px] font-black">
          Why?
        </Push>
      </div>
    </div>
  )
}

function MomentBadge({ moment }: { moment: Moment }) {
  const maxed = moment.tx.missed_cents === 0
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 top-[18%] z-20 flex justify-center"
      initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: -2 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', duration: 0.5, bounce: 0.45 }}
      role="status"
    >
      {maxed ? (
        <div className="rounded-[24px] bg-[#1FCB82] px-7 py-4 text-center text-[#1F1F1F] shadow-[0_7px_0_#12935C,0_18px_40px_rgba(18,147,92,0.35)]">
          <div className="text-[34px] font-black uppercase leading-none tracking-[0.5px]">Maximized!</div>
          <div className="flex items-center justify-center gap-3 pt-2 text-[17px] font-black tabular-nums">
            +{money(moment.tx.earned_cents)} back
            {moment.streak ? (
              <span className="flex items-center gap-1 rounded-full bg-[#1F1F1F] px-2.5 py-0.5 text-[15px] text-white">
                <FireIcon size={15} weight="fill" className="text-[#FF9A2E]" />
                {moment.streak}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-[22px] bg-white px-6 py-3.5 text-center shadow-[0_6px_0_#EADFCC,0_16px_30px_rgba(0,0,0,0.12)]">
          <div className="text-[22px] font-black">Paid · +{money(moment.tx.earned_cents)}</div>
          <div className="pt-0.5 text-[15px] font-bold text-[#6B6257]">
            {moment.bestName} would've earned {money(moment.tx.missed_cents)} more
          </div>
        </div>
      )}
    </motion.div>
  )
}

function CardMenu({ onDetails, onRemove }: { onDetails: () => void; onRemove: () => void }) {
  const frame = useFrame()
  const item = 'flex h-12 cursor-default items-center gap-3 rounded-[12px] px-3 text-[17px] font-extrabold outline-none select-none data-highlighted:bg-[#F4EADB]'
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="More"
        className="push group relative block shrink-0 rounded-[14px] outline-offset-4 focus-visible:outline-[3px] focus-visible:outline-[#1F1F1F]"
        style={{ ['--d' as string]: '3px' }}
      >
        <PushEdge color={A.tileEdge} radius={14} />
        <span className="push-face grid size-[41px] place-items-center rounded-[14px] bg-white text-[#1F1F1F]">
          <DotsThreeIcon size={26} weight="bold" />
        </span>
      </Menu.Trigger>
      <Menu.Portal container={frame}>
        <Menu.Positioner sideOffset={10} align="end" className="z-50 outline-none">
          <Menu.Popup className="arcade min-w-[210px] origin-[var(--transform-origin)] rounded-[20px] bg-white p-1.5 font-[family-name:var(--font-nunito)] text-[#1F1F1F] shadow-[0_5px_0_#EADFCC,0_20px_40px_rgba(60,40,10,0.18)] outline-none transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-[0.94] data-ending-style:opacity-0 data-starting-style:scale-[0.94] data-starting-style:opacity-0">
            <Menu.Item className={item} onClick={onDetails}>
              Card details
            </Menu.Item>
            <Menu.Item className={`${item} text-[#B3261E]`} onClick={onRemove}>
              Remove card
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
