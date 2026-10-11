import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu } from '@base-ui/react/menu'
import { CaretLeftIcon, CaretRightIcon, DotsThreeIcon, LockSimpleIcon, MapPinIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import type { Card } from '../../data/data'
import { celebrate } from '../../shared/confetti'
import { playChime, playFanfare } from '../../shared/feedback'
import { money, relativeDay } from '../../shared/format'
import { standing, type CardStanding } from '../../shared/derive'
import { useFrame } from '../../shared/frame'
import { Money } from '../../shared/Money'
import type { DemoSession } from '../../shared/session'
import { Carousel } from './Carousel'
import { HoldRing } from './HoldRing'
import { AddCardSheet, CardDetailsSheet, ConfirmRemoveSheet, StoreSheet, WhySheet } from './sheets'
import { CardArt, IconButton, L, Label, MerchantMark, Panel, Row, ScreenHeader, StatBar, cardStats } from './ui'

type SheetName = 'store' | 'why' | 'add' | 'details' | 'remove' | null
const pad = (n: number) => String(n).padStart(2, '0')

export function WalletScreen({ session, width }: { session: DemoSession; width: number }) {
  const { cards } = session
  const indexOf = (id: string | null) => (id ? cards.findIndex((c) => c.id === id) : -1)
  const [index, setIndex] = useState(() => Math.max(0, indexOf(session.winnerCardId)))
  const [view, setView] = useState<'select' | 'detail'>('select')
  const [sheet, setSheet] = useState<SheetName>(null)
  const [flash, setFlash] = useState<{ cents: number; key: number } | null>(null)

  // Arriving at a store jumps the select screen to the recommended card.
  useEffect(() => {
    const i = indexOf(session.winnerCardId)
    if (i >= 0) setIndex(i)
  }, [session.storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const safe = Math.min(index, Math.max(0, cards.length - 1))
  const card = cards[safe] as Card | undefined
  const st = card ? standing(session.rec, session.evaluation(card.id)) : ({ kind: 'no-store' } as CardStanding)
  const canPay = st.kind === 'best' || st.kind === 'behind'
  const locked = useMemo(() => new Set(cards.filter((c) => session.evaluation(c.id)?.accepted === false).map((c) => c.id)), [cards, session])

  const pay = () => {
    if (!card) return
    const tx = session.payInStore(card.id)
    if (!tx) return
    const maxed = tx.missed_cents === 0
    const streak = session.stats.streak + (maxed ? 1 : 0)
    const milestone = maxed && [3, 5, 10].includes(streak)
    playChime()
    if (milestone) setTimeout(playFanfare, 350)
    if (maxed) celebrate({ colors: [card.glow, L.money, '#ffffff'], origin: { x: 0.5, y: 0.32 }, size: milestone ? 'big' : 'small' })
    setFlash({ cents: tx.earned_cents, key: Date.now() })
  }

  const useWinner = () => {
    const i = indexOf(session.winnerCardId)
    if (i >= 0) setIndex(i)
  }

  return (
    <div className="relative pb-32">
      {card ? <Ambient color={card.glow} id={card.id} /> : null}

      <AnimatePresence mode="wait" initial={false}>
        {view === 'select' || !card ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          >
            <ScreenHeader
              kicker={`${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}
              title="Wallet"
              right={
                <IconButton label="Add card" onClick={() => setSheet('add')}>
                  <PlusIcon size={20} weight="bold" />
                </IconButton>
              }
            />
            <StoreChip session={session} onOpen={() => setSheet('store')} />

            {card ? (
              <>
                <div className="relative">
                  <Carousel
                    cards={cards}
                    index={safe}
                    onIndex={setIndex}
                    onOpen={() => setView('detail')}
                    width={width}
                    recommendedId={session.winnerCardId}
                    lockedIds={locked}
                  />
                  <Flash flash={flash} />
                </div>

                <div className="flex items-start gap-4 px-5 pt-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h2 className="truncate text-[20px] font-semibold tracking-[-0.01em]">{card.name}</h2>
                      <span className="font-mono text-[12px] tabular-nums text-[#9BA3B1]">
                        {pad(safe + 1)}/{pad(cards.length)}
                      </span>
                    </div>
                    <Status st={st} card={card} storeName={session.store?.merchant.name ?? null} onWhy={() => setSheet('why')} onPick={() => setSheet('store')} onUseBest={useWinner} big />
                  </div>
                  {canPay ? (
                    <div className="shrink-0">
                      <HoldRing key={card.id} cardName={card.name} onPaid={pay} showCaption={false} />
                    </div>
                  ) : null}
                </div>
                {canPay ? <p className="px-5 pt-1 text-right text-[12px] text-[#9BA3B1]">Simulated · no card is charged</p> : null}

                <div className="px-5 pt-5">
                  <div className="flex items-center justify-between">
                    <Label>Stats</Label>
                    <Label>Return</Label>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {cardStats(card, session.store?.merchant.category ?? null, session.store?.merchant.category_label ?? null).map((s) => (
                      <StatBar key={s.key} stat={s} accent={canPay ? L.money : '#EEF0F4'} />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('detail')}
                    className="mt-5 flex h-11 w-full items-center justify-between rounded-[12px] px-1 text-[15px] text-[#EEF0F4] focus-visible:outline-2 focus-visible:outline-[#EEF0F4]"
                  >
                    <span>Card profile and history</span>
                    <CaretRightIcon size={16} weight="bold" className="text-[#9BA3B1]" />
                  </button>
                </div>
              </>
            ) : (
              <EmptyWallet onAdd={() => setSheet('add')} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
          >
            <Detail
              card={card}
              st={st}
              canPay={canPay}
              session={session}
              flash={flash}
              onBack={() => setView('select')}
              onPay={pay}
              onWhy={() => setSheet('why')}
              onPick={() => setSheet('store')}
              onUseBest={useWinner}
              onDetails={() => setSheet('details')}
              onRemove={() => setSheet('remove')}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
          session.addCard(type, last4)
          setView('select')
          setTimeout(() => setIndex(cards.length), 300)
        }}
      />
      <CardDetailsSheet open={sheet === 'details'} onOpenChange={(o) => setSheet(o ? 'details' : null)} card={card ?? null} />
      <ConfirmRemoveSheet
        open={sheet === 'remove'}
        onOpenChange={(o) => setSheet(o ? 'remove' : null)}
        card={card ?? null}
        onRemove={() => {
          if (card) session.removeCard(card.id)
          setIndex((i) => Math.max(0, i - 1))
          setView('select')
          setSheet(null)
        }}
      />
    </div>
  )
}

/** The scene's only colored light: the selected card's glow, crossfading as you switch. */
function Ambient({ color, id }: { color: string; id: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={id}
          className="absolute left-1/2 top-[40px] h-[460px] w-[560px] -translate-x-1/2"
          style={{ background: `radial-gradient(closest-side, ${color}4D, ${color}14 55%, transparent)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
      </AnimatePresence>
    </div>
  )
}

function Flash({ flash }: { flash: { cents: number; key: number } | null }) {
  return (
    <AnimatePresence>
      {flash ? (
        <motion.div
          key={flash.key}
          className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: [0, 1, 1, 0], y: [14, -6, -6, -22], scale: 1 }}
          transition={{ duration: 2.2, times: [0, 0.15, 0.75, 1], ease: 'easeOut' }}
        >
          <span className="rounded-full bg-[#9BE36D] px-3.5 py-1.5 font-mono text-[16px] font-semibold text-[#0B0D12] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            +{money(flash.cents)} back
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function StoreChip({ session, onOpen }: { session: DemoSession; onOpen: () => void }) {
  const { store, rec } = session
  return (
    <div className="flex items-center gap-2 px-5 pb-1">
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
        onClick={onOpen}
        className="flex h-11 min-w-0 items-center gap-2 rounded-full bg-[#13161D] pl-3.5 pr-4 text-[15px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] focus-visible:outline-2 focus-visible:outline-[#EEF0F4]"
      >
        <MapPinIcon size={17} weight={store ? 'fill' : 'regular'} className={store ? 'text-[#EEF0F4]' : 'text-[#9BA3B1]'} />
        {store && rec ? (
          <span className="truncate">
            <span className="font-medium">{store.merchant.name}</span>
            <span className="font-mono text-[13px] tabular-nums text-[#9BA3B1]"> · {money(rec.amount_cents)}</span>
          </span>
        ) : (
          <span className="text-[#9BA3B1]">Where are you shopping?</span>
        )}
      </motion.button>
      {store ? (
        <IconButton label="Leave store" onClick={() => session.setStoreId(null)} className="bg-[#13161D]">
          <XIcon size={15} weight="bold" />
        </IconButton>
      ) : null}
    </div>
  )
}

function Status({
  st,
  card,
  storeName,
  onWhy,
  onPick,
  onUseBest,
  big = false,
}: {
  st: CardStanding
  card: Card
  storeName: string | null
  onWhy: () => void
  onPick: () => void
  onUseBest: () => void
  big?: boolean
}) {
  const link = 'flex h-11 items-center gap-1 text-[14px] font-medium text-[#EEF0F4] underline decoration-white/30 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#EEF0F4]'
  const numCls = big ? 'text-[34px] leading-[40px]' : 'text-[26px] leading-[32px]'
  if (st.kind === 'no-store') {
    const top = [...cardStats(card, null, null)].sort((a, b) => b.yieldPct - a.yieldPct)[0]
    return (
      <div className="pt-1">
        <p className="text-[14px] text-[#9BA3B1]">
          Strongest at <span className="text-[#EEF0F4]">{top.label.toLowerCase()}</span> · <span className="font-mono tabular-nums">{top.yieldPct.toFixed(1)}%</span>
        </p>
        <button type="button" onClick={onPick} className={link}>
          Choose a store to see what it earns
        </button>
      </div>
    )
  }
  if (st.kind === 'rejected')
    return (
      <div className="pt-1">
        <p className={`flex items-center gap-2 font-semibold ${big ? 'text-[22px] leading-[32px]' : 'text-[18px]'}`}>
          <LockSimpleIcon size={big ? 22 : 18} weight="bold" className="text-[#9BA3B1]" /> Not accepted
        </p>
        <p className="text-[14px] text-[#9BA3B1]">{st.reason}</p>
        <button type="button" onClick={onUseBest} className={link}>
          Switch to the recommended card
        </button>
      </div>
    )
  if (st.kind === 'behind')
    return (
      <div className="pt-0.5">
        <div className={`font-mono font-medium tabular-nums ${numCls}`}>
          +<Money cents={st.value} />
        </div>
        <p className="text-[14px] text-[#9BA3B1]">
          {st.bestName} earns <span className="font-mono tabular-nums text-[#EEF0F4]">{money(st.behindBy)}</span> more
        </p>
        <button type="button" onClick={onUseBest} className={link}>
          Switch to {st.bestName}
        </button>
      </div>
    )
  return (
    <div className="pt-0.5">
      <div className={`font-mono font-medium tabular-nums text-[#9BE36D] ${numCls}`}>
        +<Money cents={st.value} />
      </div>
      <p className="truncate text-[14px] text-[#9BA3B1]">
        {storeName ? `at ${storeName} · ` : ''}
        {st.short}
      </p>
      <button type="button" onClick={onWhy} className={link}>
        Why this card
      </button>
    </div>
  )
}

function Detail({
  card,
  st,
  canPay,
  session,
  flash,
  onBack,
  onPay,
  onWhy,
  onPick,
  onUseBest,
  onDetails,
  onRemove,
}: {
  card: Card
  st: CardStanding
  canPay: boolean
  session: DemoSession
  flash: { cents: number; key: number } | null
  onBack: () => void
  onPay: () => void
  onWhy: () => void
  onPick: () => void
  onUseBest: () => void
  onDetails: () => void
  onRemove: () => void
}) {
  const txs = session.historyFor(card.id).slice(0, 12)
  return (
    <div>
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <IconButton label="Back to cards" onClick={onBack}>
          <CaretLeftIcon size={18} weight="bold" />
        </IconButton>
        <Label>Card profile</Label>
        <CardMenu onDetails={onDetails} onRemove={onRemove} />
      </div>
      <div className="relative px-6">
        <motion.div
          className="aspect-[340/214] w-full rounded-[16px]"
          style={{ boxShadow: `0 30px 60px -24px ${card.glow}AA, 0 12px 28px rgba(0,0,0,0.55)` }}
          initial={{ y: 12 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
        >
          <CardArt card={card} locked={st.kind === 'rejected'} />
        </motion.div>
        <Flash flash={flash} />
      </div>
      <div className="flex items-start gap-4 px-6 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[20px] font-semibold">{card.name}</h2>
          <Status st={st} card={card} storeName={session.store?.merchant.name ?? null} onWhy={onWhy} onPick={onPick} onUseBest={onUseBest} />
        </div>
        {canPay ? <HoldRing key={card.id} cardName={card.name} onPaid={onPay} showCaption={false} size={76} /> : null}
      </div>
      {canPay ? <p className="px-6 pt-1 text-right text-[12px] text-[#9BA3B1]">Simulated · no card is charged</p> : null}

      <div className="px-5 pt-7">
        <div className="flex items-center justify-between px-1 pb-2">
          <Label>Latest</Label>
          <span className="font-mono text-[12px] tabular-nums text-[#9BA3B1]">{session.historyFor(card.id).length} purchases</span>
        </div>
        <Panel>
          {txs.length ? (
            txs.map((t, i) => (
              <motion.div key={t.id} layout="position" initial={t.id.startsWith('session') ? { opacity: 0, y: -8 } : false} animate={{ opacity: 1, y: 0 }}>
                <Row
                  leading={<MerchantMark id={t.merchant_id} name={t.merchant_name} size={34} />}
                  title={t.merchant_name}
                  subtitle={`${relativeDay(t.ts)} · ${t.channel === 'store' ? 'In store' : 'Online'}`}
                  trailing={
                    <div className="font-mono tabular-nums">
                      <div className="text-[15px]">{money(t.amount_cents)}</div>
                      <div className={`text-[12px] ${t.missed_cents ? 'text-[#9BA3B1]' : 'text-[#9BE36D]'}`}>
                        {t.missed_cents ? `${money(t.missed_cents)} missed` : `+${money(t.earned_cents)}`}
                      </div>
                    </div>
                  }
                  last={i === txs.length - 1}
                />
              </motion.div>
            ))
          ) : (
            <div className="px-5 py-9 text-center">
              <p className="text-[16px] font-medium">No purchases yet</p>
              <p className="pt-1 text-[14px] text-[#9BA3B1]">Pay with {card.name} and it shows up here.</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function CardMenu({ onDetails, onRemove }: { onDetails: () => void; onRemove: () => void }) {
  const frame = useFrame()
  const item = 'flex h-11 cursor-default items-center px-4 text-[16px] outline-none select-none data-highlighted:bg-white/[0.07]'
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="More"
        className="grid size-11 place-items-center rounded-full bg-[#1A1E27] text-[#EEF0F4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] focus-visible:outline-2 focus-visible:outline-[#EEF0F4] data-popup-open:bg-[#252a35]"
      >
        <DotsThreeIcon size={22} weight="bold" />
      </Menu.Trigger>
      <Menu.Portal container={frame}>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup className="min-w-[210px] origin-[var(--transform-origin)] overflow-hidden rounded-[14px] bg-[#1A1E27] py-1 font-[family-name:var(--font-grotesk)] text-[#EEF0F4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_24px_48px_rgba(0,0,0,0.6)] outline-none transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0">
            <Menu.Item className={item} onClick={onDetails}>
              Card details
            </Menu.Item>
            <Menu.Separator className="mx-3 h-px bg-white/[0.07]" />
            <Menu.Item className={`${item} text-[#FF8A80]`} onClick={onRemove}>
              Remove card
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

function EmptyWallet({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mx-5 mt-6 rounded-[18px] px-6 py-12 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      <p className="text-[18px] font-semibold">Your loadout is empty</p>
      <p className="mx-auto max-w-[28ch] pt-1 text-[14px] text-[#9BA3B1]">Add the cards you carry and we'll pick the right one at every store.</p>
      <button type="button" onClick={onAdd} className="mt-5 h-11 rounded-full bg-[#EEF0F4] px-5 text-[15px] font-semibold text-[#0B0D12]">
        Add a card
      </button>
    </div>
  )
}
