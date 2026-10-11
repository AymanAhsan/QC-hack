import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useAnimate } from 'motion/react'
import { Menu } from '@base-ui/react/menu'
import { DotsThreeIcon, MapPinIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import type { Card, RecommendResponse } from '../../data/data'
import { celebrate } from '../../shared/confetti'
import { playChime, playFanfare } from '../../shared/feedback'
import { money, relativeDay } from '../../shared/format'
import { standing, type CardStanding } from '../../shared/derive'
import { useFrame } from '../../shared/frame'
import type { DemoSession } from '../../shared/session'
import { Money } from '../../shared/Money'
import { PayStamp } from './PayStamp'
import { AddCardSheet, CardDetailsSheet, ConfirmRemoveSheet, StoreSheet, WhySheet } from './sheets'
import { Box, CardArt, CARD_RATIO, FONT, IconBtn, Label, LinkBtn, MerchantMark, NETWORK_NAME, Press, Row, Stamp, Sticker, Title } from './ui'

const HAND_W = 128
const HAND_H = Math.round(HAND_W * CARD_RATIO)
const DETAIL_W = 160
const DETAIL_H = Math.round(DETAIL_W * CARD_RATIO)
const cardSpring = { type: 'spring', duration: 0.55, bounce: 0.18 } as const
const CONFETTI = ['#111111', '#FF5B1F', '#FBF8F1', '#0E7A45']

type SheetName = 'store' | 'why' | 'add' | 'details' | 'remove' | null
type StampState = { kind: 'maxed' | 'paid'; key: number; earned: number; missed: number } | null

export function WalletScreen({ session, width }: { session: DemoSession; width: number }) {
  const [presented, setPresented] = useState<string | null>(session.winnerCardId)
  const [fromAngle, setFromAngle] = useState(0)
  const [returning, setReturning] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetName>(null)
  const [stamp, setStamp] = useState<StampState>(null)

  // Walking into a store pulls the winning card out of the hand.
  useEffect(() => {
    setFromAngle(0)
    setPresented(session.winnerCardId)
    setStamp(null)
  }, [session.storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const card = session.cards.find((c) => c.id === presented) ?? null

  const open = (id: string, angle: number) => {
    setFromAngle(angle)
    setReturning(null)
    setStamp(null)
    setPresented(id)
  }
  const backToHand = () => {
    setReturning(presented)
    setStamp(null)
    setPresented(null)
  }

  const pay = () => {
    if (!card) return
    const tx = session.payInStore(card.id)
    if (!tx) return
    const maxed = tx.missed_cents === 0
    const streak = session.stats.streak + (maxed ? 1 : 0)
    const milestone = maxed && [3, 5, 10].includes(streak)
    playChime()
    if (milestone) setTimeout(playFanfare, 380)
    setStamp({ kind: maxed ? 'maxed' : 'paid', key: Date.now(), earned: tx.earned_cents, missed: tx.missed_cents })
    if (maxed) celebrate({ colors: CONFETTI, shapes: ['square'], origin: { x: 0.28, y: 0.36 }, size: milestone ? 'big' : 'small', scalar: 1.1 })
  }

  return (
    <LayoutGroup>
      <div className="pb-36">
        <AnimatePresence mode="popLayout" initial={false}>
          {card ? (
            <motion.div key="detail-head" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
              <div className="flex items-center justify-between px-4 pb-3 pt-1">
                <Press onClick={backToHand} className="flex h-11 items-center rounded-full border-2 border-[#111] bg-[#FBF8F1] px-5 text-[16px] font-extrabold">
                  Done
                </Press>
                <CardMenu onDetails={() => setSheet('details')} onRemove={() => setSheet('remove')} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="hand-head" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
              <Title
                right={
                  <IconBtn label="Add card" onClick={() => setSheet('add')}>
                    <PlusIcon size={22} weight="bold" />
                  </IconBtn>
                }
              >
                Wallet
              </Title>
            </motion.div>
          )}
        </AnimatePresence>

        <StoreChip session={session} onOpen={() => setSheet('store')} />

        {card ? (
          <Detail
            card={card}
            session={session}
            fromAngle={fromAngle}
            stamp={stamp}
            onPay={pay}
            onWhy={() => setSheet('why')}
            onPickStore={() => setSheet('store')}
            onSwitch={(id) => open(id, 0)}
          />
        ) : (
          <Hand cards={session.cards} width={width - 32} session={session} returning={returning} onOpen={open} />
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
          setTimeout(() => open(c.id, 0), 380)
        }}
      />
      <CardDetailsSheet open={sheet === 'details'} onOpenChange={(o) => setSheet(o ? 'details' : null)} card={card} />
      <ConfirmRemoveSheet
        open={sheet === 'remove'}
        onOpenChange={(o) => setSheet(o ? 'remove' : null)}
        card={card}
        onRemove={() => {
          if (card) session.removeCard(card.id)
          setReturning(null)
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
    <div className="flex items-center gap-2.5 px-4 pb-5">
      <Press onClick={onOpen} className="flex h-11 min-w-0 items-center gap-2 rounded-full border-2 border-[#111] bg-[#FBF8F1] pl-3 pr-4 text-[15px]">
        <MapPinIcon size={18} weight="fill" className={store ? 'text-[#FF5B1F]' : 'text-[#111]/40'} />
        {store && rec ? (
          <span className="truncate">
            <span className="font-extrabold">{store.merchant.name}</span>
            <span className="font-semibold text-[#4A4741]"> · {money(rec.amount_cents)}</span>
          </span>
        ) : (
          <span className="font-bold text-[#4A4741]">Where are you shopping?</span>
        )}
      </Press>
      {store ? (
        <IconBtn label="Leave store" onClick={() => session.setStoreId(null)} className="rounded-full">
          <XIcon size={16} weight="bold" />
        </IconBtn>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------- the hand

function fan(n: number, W: number) {
  const A = n > 1 ? Math.min(18, 4.5 * (n - 1)) : 0
  const R = 300
  const top = 34
  const pivotX = W / 2
  const pivotY = top + HAND_H / 2 + R
  const spots = Array.from({ length: n }, (_, i) => {
    const deg = n > 1 ? -A + (i * 2 * A) / (n - 1) : 0
    const rad = (deg * Math.PI) / 180
    return { cx: pivotX + R * Math.sin(rad), cy: pivotY - R * Math.cos(rad), deg }
  })
  const height = top + HAND_H + R * (1 - Math.cos((A * Math.PI) / 180)) + (HAND_W / 2) * Math.sin((A * Math.PI) / 180) + 12
  return { spots, height }
}

function Hand({
  cards,
  width,
  session,
  returning,
  onOpen,
}: {
  cards: Card[]
  width: number
  session: DemoSession
  returning: string | null
  onOpen: (id: string, angle: number) => void
}) {
  const { spots, height } = fan(cards.length, width)
  if (!cards.length) {
    return (
      <div className="px-4">
        <Box className="px-6 py-10 text-center" raised>
          <p className={`${FONT} text-[26px] font-extrabold tracking-[-0.02em]`}>Empty hand</p>
          <p className="pt-1 text-[15px] font-semibold text-[#4A4741]">Add the cards you carry. We'll pick the best one at every store.</p>
        </Box>
      </div>
    )
  }
  return (
    <div>
      <div className="relative mx-4" style={{ height }}>
        {cards.map((c, i) => {
          const s = spots[i]
          const ev = session.evaluation(c.id)
          const best = session.winnerCardId === c.id
          const rejected = ev ? !ev.accepted : false
          const back = returning === c.id
          return (
            <motion.div
              key={c.id}
              layoutId={`s-card-${c.id}`}
              transition={cardSpring}
              className="pointer-events-none absolute"
              style={{ left: s.cx - HAND_W / 2, top: s.cy - HAND_H / 2, width: HAND_W, height: HAND_H, zIndex: i, borderRadius: 10 }}
            >
              <motion.button
                type="button"
                aria-label={`${c.name} ending ${c.last4}${ev ? (ev.accepted ? `, earns ${money(ev.value_cents)} here` : ', not accepted here') : ''}`}
                onClick={() => onOpen(c.id, s.deg)}
                initial={back ? { rotate: 0 } : { rotate: s.deg, y: 48, opacity: 0 }}
                animate={{ rotate: s.deg, y: best ? -22 : 0, opacity: 1 }}
                whileHover="lift"
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', duration: 0.5, bounce: 0.22, delay: back ? 0 : 0.04 * i }}
                className="pointer-events-auto relative block h-full w-full outline-offset-[3px] focus-visible:outline-2 focus-visible:outline-[#111]"
                style={{ borderRadius: 10 }}
              >
                {/* The hover lift lives on this inner layer so the hit area stays put (no hover flicker loop). */}
                <motion.span
                  className="relative block h-full w-full"
                  variants={{ lift: { y: -10 } }}
                  transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
                  style={{ boxShadow: '3px 3px 0 #111', borderRadius: 10 }}
                >
                  <CardArt card={c} width={HAND_W} dim={rejected} />
                  {best ? <Sticker className="absolute -right-4 -top-3">Best here</Sticker> : null}
                </motion.span>
              </motion.button>
            </motion.div>
          )
        })}
      </div>
      <p className="px-6 pt-1 text-center text-[14px] font-semibold text-[#4A4741]">{handHint(session)}</p>
      <Recent session={session} />
    </div>
  )
}

function handHint(session: DemoSession) {
  const { store, rec } = session
  if (!store || !rec?.winner_card_id) return 'Tap a card to pull it out of the hand.'
  const winner = rec.ranking.find((r) => r.is_winner)?.card_name
  const refused = [...new Set(rec.why?.network.rejections.map((r) => NETWORK_NAME[r.network]) ?? [])]
  const no = refused.length ? ` ${store.merchant.name} doesn't take ${refused.join(' or ')}.` : ''
  return `${winner} wins at ${store.merchant.name}.${no} Tap a card to pull it out.`
}

/** Recent purchases across the hand, so the home screen shows what the stamps mean. */
function Recent({ session }: { session: DemoSession }) {
  const txs = session.history.slice(0, 4)
  return (
    <div className="px-4 pt-7">
      <Label>Recent</Label>
      <Box>
        {txs.map((t, i) => {
          const maxed = t.missed_cents === 0
          const used = session.cards.find((c) => c.id === t.card_used_id)?.name ?? 'Card'
          return (
            <Row
              key={t.id}
              first={i === 0}
              leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} />}
              title={t.merchant_name}
              subtitle={`${relativeDay(t.ts)} · ${used}`}
              trailing={
                maxed ? (
                  <div className="flex flex-col items-end gap-1">
                    <Stamp kind="maxed" size="sm" still />
                    <span className="text-[13px] font-bold tabular-nums text-[#0E7A45]">+{money(t.earned_cents)}</span>
                  </div>
                ) : (
                  <div className="tabular-nums">
                    <div className="text-[16px] font-extrabold">{money(t.amount_cents)}</div>
                    <div className="text-[13px] font-bold text-[#4A4741]">{money(t.missed_cents)} missed</div>
                  </div>
                )
              }
            />
          )
        })}
      </Box>
    </div>
  )
}

// ---------------------------------------------------------------- detail

function Detail({
  card,
  session,
  fromAngle,
  stamp,
  onPay,
  onWhy,
  onPickStore,
  onSwitch,
}: {
  card: Card
  session: DemoSession
  fromAngle: number
  stamp: StampState
  onPay: () => void
  onWhy: () => void
  onPickStore: () => void
  onSwitch: (id: string) => void
}) {
  const ev = session.evaluation(card.id)
  const st = standing(session.rec, ev)
  const txs = useMemo(() => session.historyFor(card.id).slice(0, 10), [session, card.id])
  const canPay = st.kind === 'best' || st.kind === 'behind'
  const [scope, animate] = useAnimate()

  // The stamp lands, the card takes the hit.
  useEffect(() => {
    if (!stamp || !scope.current) return
    void animate(scope.current, { rotate: [0, -2.4, 1.6, -0.6, 0], y: [0, 5, -1, 0, 0] }, { duration: 0.45, delay: 0.1, ease: 'easeOut' })
  }, [stamp?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-start gap-4 px-4">
        <div className="relative shrink-0" style={{ width: DETAIL_W, height: DETAIL_H }}>
          <motion.div layoutId={`s-card-${card.id}`} transition={cardSpring} className="absolute inset-0" style={{ borderRadius: 12 }}>
            <motion.div
              ref={scope}
              className="h-full w-full"
              initial={{ rotate: fromAngle }}
              animate={{ rotate: 0 }}
              transition={cardSpring}
              style={{ boxShadow: '5px 5px 0 #111', borderRadius: 12 }}
            >
              <CardArt card={card} width={DETAIL_W} dim={st.kind === 'rejected'} />
            </motion.div>
          </motion.div>
          <AnimatePresence>
            {stamp ? (
              <motion.div key={stamp.key} className="pointer-events-none absolute inset-0 grid place-items-center" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                <Stamp kind={stamp.kind} size="md" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <motion.div
          className="min-w-0 flex-1 pt-1"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0, delay: 0.15 }}
        >
          <Facts st={st} card={card} rec={session.rec} stamp={stamp} onWhy={onWhy} onPickStore={onPickStore} onSwitch={() => session.winnerCardId && onSwitch(session.winnerCardId)} />
        </motion.div>
      </div>

      {canPay ? (
        <div className="pt-6">
          <PayStamp key={card.id} cardName={card.name} onPaid={onPay} />
        </div>
      ) : (
        <div className="h-7" />
      )}

      <div className="px-4 pt-7">
        <Label>Latest from this card</Label>
        <Box>
          {txs.length ? (
            txs.map((t, i) => (
              <motion.div key={t.id} layout="position" initial={t.id.startsWith('session') ? { opacity: 0, y: -10 } : false} animate={{ opacity: 1, y: 0 }}>
                <Row
                  first={i === 0}
                  leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} />}
                  title={t.merchant_name}
                  subtitle={`${relativeDay(t.ts)} · ${t.channel === 'store' ? 'In store' : 'Online'}`}
                  trailing={
                    <div className="tabular-nums">
                      <div className="text-[16px] font-extrabold">{money(t.amount_cents)}</div>
                      <div className={`text-[13px] font-bold ${t.missed_cents ? 'text-[#4A4741]' : 'text-[#0E7A45]'}`}>
                        {t.missed_cents ? `${money(t.missed_cents)} missed` : `+${money(t.earned_cents)}`}
                      </div>
                    </div>
                  }
                />
              </motion.div>
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-[17px] font-extrabold">Nothing on this card yet</p>
              <p className="pt-1 text-[14px] font-semibold text-[#4A4741]">Payments with {card.name} land here.</p>
            </div>
          )}
        </Box>
      </div>
    </div>
  )
}

function Facts({
  st,
  card,
  rec,
  stamp,
  onWhy,
  onPickStore,
  onSwitch,
}: {
  st: CardStanding
  card: Card
  rec: RecommendResponse | null
  stamp: StampState
  onWhy: () => void
  onPickStore: () => void
  onSwitch: () => void
}) {
  const big = `${FONT} text-[38px] font-extrabold leading-[0.95] tracking-[-0.03em] tabular-nums [font-stretch:85%]`
  if (stamp) {
    return (
      <div>
        <div className="text-[13px] font-extrabold uppercase tracking-[0.12em]">Paid {rec ? money(rec.amount_cents) : ''}</div>
        <div className={`${big} pt-2 ${stamp.earned ? 'text-[#0E7A45]' : ''}`}>
          +<Money cents={stamp.earned} />
        </div>
        <div className="pt-1 text-[15px] font-bold">{stamp.missed ? `${money(stamp.missed)} missed vs the best card` : 'Nothing left on the table'}</div>
      </div>
    )
  }
  if (st.kind === 'no-store')
    return (
      <div>
        <div className={`${FONT} text-[24px] font-extrabold leading-[1.05] tracking-[-0.02em]`}>{card.name}</div>
        <p className="pt-2 text-[15px] font-semibold text-[#4A4741]">Pick a store to see what this card earns there.</p>
        <LinkBtn onClick={onPickStore} className="-ml-1 mt-1">
          Choose a store
        </LinkBtn>
      </div>
    )
  if (st.kind === 'rejected') {
    const net = NETWORK_NAME[card.network] ?? card.network
    return (
      <div>
        <div className="text-[13px] font-extrabold uppercase tracking-[0.12em]">Not accepted</div>
        <div className={`${FONT} pt-2 text-[24px] font-extrabold leading-[1.05] tracking-[-0.02em]`}>
          {rec?.merchant.name} doesn't take {net}
        </div>
        <LinkBtn onClick={onSwitch} className="-ml-1 mt-2">
          Use the best card
        </LinkBtn>
      </div>
    )
  }
  if (st.kind === 'behind')
    return (
      <div>
        <div className="text-[13px] font-extrabold uppercase tracking-[0.12em]">Earns here</div>
        <div className={`${big} pt-2`}>
          +<Money cents={st.value} />
        </div>
        <div className="pt-1 text-[15px] font-bold">{st.short}</div>
        <p className="pt-3 text-[15px] font-semibold text-[#4A4741]">
          {st.bestName} earns {money(st.behindBy)} more.
        </p>
        <LinkBtn onClick={onSwitch} className="-ml-1">
          Switch to {st.bestName}
        </LinkBtn>
      </div>
    )
  const runner = rec?.why?.advantage.runner_up
  return (
    <div>
      <Sticker className="-ml-0.5 mb-3">Best here</Sticker>
      <div className={`${big} text-[#0E7A45]`}>
        +<Money cents={st.value} />
      </div>
      <div className="pt-1 text-[15px] font-bold">back · {st.short}</div>
      {runner ? (
        <p className="pt-3 text-[14px] font-semibold leading-[19px] text-[#4A4741]">
          {money(runner.advantage_cents)} more than {runner.card_name}
        </p>
      ) : null}
      <LinkBtn onClick={onWhy} className="-ml-1">
        Why this card?
      </LinkBtn>
    </div>
  )
}

function CardMenu({ onDetails, onRemove }: { onDetails: () => void; onRemove: () => void }) {
  const frame = useFrame()
  const item = 'flex h-12 cursor-default items-center px-4 text-[16px] font-bold outline-none select-none data-highlighted:bg-[#FF5B1F]'
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="More"
        className="grid size-11 place-items-center rounded-[12px] border-2 border-[#111] bg-[#FBF8F1] shadow-[3px_3px_0_#111] outline-offset-[3px] focus-visible:outline-2 focus-visible:outline-[#111] data-popup-open:translate-x-[3px] data-popup-open:translate-y-[3px] data-popup-open:shadow-none"
      >
        <DotsThreeIcon size={24} weight="bold" />
      </Menu.Trigger>
      <Menu.Portal container={frame}>
        <Menu.Positioner sideOffset={10} align="end" className="z-50 outline-none">
          <Menu.Popup className="min-w-[210px] origin-[var(--transform-origin)] overflow-hidden rounded-[14px] border-2 border-[#111] bg-[#FBF8F1] font-[family-name:var(--font-bricolage)] text-[#111] shadow-[4px_4px_0_#111] outline-none transition-[scale,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0">
            <Menu.Item className={item} onClick={onDetails}>
              Card details
            </Menu.Item>
            <Menu.Separator className="h-[2px] bg-[#111]" />
            <Menu.Item className={`${item} text-[#B42318] data-highlighted:text-[#111]`} onClick={onRemove}>
              Remove card
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
