import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Menu } from '@base-ui/react/menu'
import { CaretDownIcon, DotsThreeIcon, MapPinIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import { categoryLabel, type Card } from '../../data/data'
import { celebrate } from '../../shared/confetti'
import { standing } from '../../shared/derive'
import { playChime, playFanfare } from '../../shared/feedback'
import { money, relativeDay } from '../../shared/format'
import { useFrame } from '../../shared/frame'
import { Money } from '../../shared/Money'
import type { DemoSession } from '../../shared/session'
import { PayButton } from './PayButton'
import { AddCardSheet, CardDetailsSheet, ConfirmRemoveSheet, StoreSheet, WhySheet, refusal } from './sheets'
import { CardArt, IconButton, Masthead, MerchantMark, TextButton, cardSpring, focusRing, hairline, muted, serif } from './ui'

type SheetName = 'store' | 'why' | 'add' | 'details' | 'remove' | null
const CARD_RATIO = 214 / 340

export function WalletScreen({ session, width }: { session: DemoSession; width: number }) {
  const [open, setOpen] = useState<string | null>(session.winnerCardId)
  const [sheet, setSheet] = useState<SheetName>(null)
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef<number | undefined>(undefined)
  const userOpened = useRef(false)
  const openByTap = (id: string | null) => {
    userOpened.current = true
    setOpen(id)
  }

  // Arriving somewhere opens the card that wins there.
  useEffect(() => {
    userOpened.current = false
    setOpen(session.winnerCardId)
    setNote(null)
  }, [session.storeId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(noteTimer.current), [])

  const ordered = useMemo(() => {
    if (!session.rec) return session.cards
    const value = (c: Card) => {
      const ev = session.evaluation(c.id)
      if (!ev) return -2
      if (!ev.accepted) return -1
      return ev.value_cents + (ev.is_winner ? 1e6 : 0)
    }
    return [...session.cards].sort((a, b) => value(b) - value(a))
  }, [session])

  const openCard = session.cards.find((c) => c.id === open) ?? null
  const cardW = width - 40

  const pay = (card: Card) => {
    const tx = session.payInStore(card.id)
    if (!tx) return
    const maxed = tx.missed_cents === 0
    const streak = maxed ? session.stats.streak + 1 : 0
    const milestone = maxed && [3, 5, 10].includes(streak)
    playChime()
    if (maxed) {
      celebrate({ colors: ['#141414', '#0F7B4A', '#D9D3C4'], origin: { x: 0.5, y: 0.42 }, size: milestone ? 'big' : 'small', scalar: 0.9 })
      if (milestone) setTimeout(playFanfare, 350)
    }
    setNote(maxed ? `Paid ${money(tx.amount_cents)} · streak ${streak}` : `Paid · ${money(tx.missed_cents)} left on the table`)
    clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(null), 3200)
  }

  return (
    <LayoutGroup>
      <div className="pb-28">
        <Masthead
          title="Wallet"
          right={
            <IconButton label="Add card" onClick={() => setSheet('add')}>
              <PlusIcon size={20} weight="bold" />
            </IconButton>
          }
        />
        <StoreLine session={session} onOpen={() => setSheet('store')} />

        {ordered.length ? (
          <ul className="px-5">
            {ordered.map((c) =>
              c.id === open ? (
                <Expanded
                  key={c.id}
                  card={c}
                  cardW={cardW}
                  session={session}
                  note={note}
                  onPay={() => pay(c)}
                  scrollOnMount={userOpened.current}
                  onClose={() => setOpen(null)}
                  onOpen={openByTap}
                  onWhy={() => setSheet('why')}
                  onPick={() => setSheet('store')}
                  onDetails={() => setSheet('details')}
                  onRemove={() => setSheet('remove')}
                />
              ) : (
                <CardRow key={c.id} card={c} session={session} onOpen={() => openByTap(c.id)} />
              ),
            )}
          </ul>
        ) : (
          <div className="px-5 pt-10">
            <p className={`${serif} text-[32px] leading-[36px]`}>No cards yet.</p>
            <p className={`max-w-[32ch] pt-2 text-[16px] ${muted}`}>Add the cards you carry and we'll pick the best one at every store.</p>
            <TextButton onClick={() => setSheet('add')}>Add a card</TextButton>
          </div>
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
          setTimeout(() => openByTap(c.id), 350)
        }}
      />
      <CardDetailsSheet open={sheet === 'details'} onOpenChange={(o) => setSheet(o ? 'details' : null)} card={openCard} />
      <ConfirmRemoveSheet
        open={sheet === 'remove'}
        onOpenChange={(o) => setSheet(o ? 'remove' : null)}
        card={openCard}
        onRemove={() => {
          if (openCard) session.removeCard(openCard.id)
          setOpen(null)
          setSheet(null)
        }}
      />
    </LayoutGroup>
  )
}

function StoreLine({ session, onOpen }: { session: DemoSession; onOpen: () => void }) {
  const { store, rec } = session
  return (
    <div className="mx-5 mb-1 flex items-center border-y-[0.5px] border-[rgba(20,20,20,0.2)]">
      <button type="button" onClick={onOpen} className={`flex h-12 min-w-0 flex-1 items-center gap-2 text-left text-[15px] ${focusRing}`}>
        <MapPinIcon size={18} weight={store ? 'fill' : 'regular'} className={store ? 'text-[#0F7B4A]' : 'text-[#5E5D58]'} />
        {store && rec ? (
          <span className="truncate">
            <span className="font-semibold">{store.merchant.name}</span>
            <span className={muted}> · {money(rec.amount_cents)} checkout</span>
          </span>
        ) : (
          <span className="font-medium">Where are you shopping?</span>
        )}
        <CaretDownIcon size={14} weight="bold" className="shrink-0 text-[#5E5D58]" />
      </button>
      {store ? (
        <button
          type="button"
          aria-label="Leave store"
          onClick={() => session.setStoreId(null)}
          className={`-mr-2.5 grid size-11 place-items-center text-[#141414] ${focusRing}`}
        >
          <XIcon size={18} />
        </button>
      ) : null}
    </div>
  )
}

function CardRow({ card, session, onOpen }: { card: Card; session: DemoSession; onOpen: () => void }) {
  const ev = session.evaluation(card.id)
  const best = ev?.is_winner
  return (
    <motion.li layout="position" transition={cardSpring} className={hairline}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${card.name} ending ${card.last4}${ev ? (ev.accepted ? `, earns ${money(ev.value_cents)} here` : ', not accepted here') : ''}`}
        className={`flex min-h-[64px] w-full items-center gap-3.5 py-3 text-left transition-colors duration-150 active:bg-[#141414]/[0.03] ${focusRing}`}
      >
        <motion.span
          layoutId={`l-card-${card.id}`}
          transition={cardSpring}
          className="block h-[36px] w-[56px] shrink-0 shadow-[0_1px_2px_rgba(20,20,20,0.18),0_2px_6px_-2px_rgba(20,20,20,0.18)]"
          style={{ borderRadius: 5 }}
        >
          <CardArt card={card} size="mini" />
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium">{card.name}</span>
          <span className={`block text-[14px] tabular-nums ${muted}`}>•••• {card.last4}</span>
        </span>
        {!ev ? <span className={`text-right text-[14px] ${muted}`}>{headline(card)}</span> : null}
        {ev ? (
          ev.accepted ? (
            <span className="text-right">
              {best ? <span className={`${serif} block text-[16px] italic leading-none text-[#0F7B4A]`}>Best here</span> : null}
              <span className={`text-[15px] tabular-nums ${best ? 'font-semibold text-[#0F7B4A]' : ''}`}>earns {money(ev.value_cents)}</span>
            </span>
          ) : (
            <span className={`text-[15px] ${muted}`}>Not accepted</span>
          )
        ) : null}
      </button>
    </motion.li>
  )
}

function Expanded({
  card,
  cardW,
  session,
  note,
  scrollOnMount,
  onPay,
  onClose,
  onOpen,
  onWhy,
  onPick,
  onDetails,
  onRemove,
}: {
  card: Card
  cardW: number
  session: DemoSession
  note: string | null
  scrollOnMount: boolean
  onPay: () => void
  onClose: () => void
  onOpen: (id: string) => void
  onWhy: () => void
  onPick: () => void
  onDetails: () => void
  onRemove: () => void
}) {
  const ev = session.evaluation(card.id)
  const st = standing(session.rec, ev)
  const [all, setAll] = useState(false)
  const txs = session.historyFor(card.id)
  const shown = txs.slice(0, all ? 12 : 3)
  const storeName = session.store?.merchant.name ?? ''
  const bestId = session.winnerCardId
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!scrollOnMount) return
    const t = setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.li ref={ref} layout="position" transition={cardSpring} className={`scroll-mt-[calc(var(--sat)+4px)] pb-6 ${hairline}`}>
      <div className="flex items-center justify-between pb-2.5 pt-3">
        <span className={`${serif} text-[24px] italic leading-none ${st.kind === 'best' ? 'text-[#0F7B4A]' : ''}`}>
          {st.kind === 'best' ? 'Best here' : st.kind === 'behind' && ev?.rank ? `No. ${ev.rank} here` : st.kind === 'rejected' ? 'Not accepted here' : card.name}
        </span>
        <div className="-mr-1 flex items-center gap-1">
          <CardMenu onDetails={onDetails} onRemove={onRemove} />
          <button type="button" aria-label={`Close ${card.name}`} onClick={onClose} className={`grid size-11 place-items-center rounded-full ${focusRing}`}>
            <XIcon size={18} />
          </button>
        </div>
      </div>

      <motion.button
        type="button"
        layoutId={`l-card-${card.id}`}
        transition={cardSpring}
        onClick={onClose}
        aria-label={`${card.name} ending ${card.last4}. Tap to close`}
        className={`block shadow-[0_1px_2px_rgba(20,20,20,0.12),0_12px_28px_-10px_rgba(20,20,20,0.35)] ${focusRing}`}
        style={{ width: cardW, height: Math.round(cardW * CARD_RATIO), borderRadius: 12 }}
      >
        <CardArt card={card} size="full" />
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', duration: 0.4, bounce: 0, delay: 0.1 }}>
        <Status
          st={st}
          card={card}
          storeName={storeName}
          runner={session.rec?.why?.advantage.runner_up ?? null}
          onWhy={onWhy}
          onPick={onPick}
          onUseBest={() => bestId && onOpen(bestId)}
        />

        {st.kind === 'best' || st.kind === 'behind' ? (
          <div className="pt-5">
            <PayButton key={card.id} cardName={card.name} onPaid={onPay} note={note} />
          </div>
        ) : null}

        <div className="pt-7">
          <div className={`flex items-baseline justify-between pb-1.5 ${hairline}`}>
            <h3 className="text-[13px] font-semibold uppercase tracking-[1.2px]">Latest</h3>
            {txs.length > 3 ? (
              <button type="button" onClick={() => setAll((a) => !a)} className={`-my-2 h-11 text-[14px] font-medium underline decoration-[rgba(20,20,20,0.35)] underline-offset-4 ${focusRing}`}>
                {all ? 'Show less' : `All ${txs.length}`}
              </button>
            ) : null}
          </div>
          {shown.length ? (
            <ul>
              <AnimatePresence initial={false}>
                {shown.map((t) => (
                  <motion.li
                    key={t.id}
                    layout="position"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
                    className={`flex items-center gap-3 py-3 ${hairline}`}
                  >
                    <MerchantMark id={t.merchant_id} name={t.merchant_name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px]">{t.merchant_name}</span>
                      <span className={`block text-[14px] ${muted}`}>
                        {relativeDay(t.ts)} · {t.channel === 'store' ? 'In store' : 'Online'}
                      </span>
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block text-[16px]">{money(t.amount_cents)}</span>
                      <span className={`block text-[14px] ${t.missed_cents ? muted : 'text-[#0F7B4A]'}`}>
                        {t.missed_cents ? `${money(t.missed_cents)} missed` : `+${money(t.earned_cents)}`}
                      </span>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className={`py-4 text-[15px] ${muted}`}>No purchases with {card.name} yet.</p>
          )}
        </div>
      </motion.div>
    </motion.li>
  )
}

function Status({
  st,
  card,
  storeName,
  runner,
  onWhy,
  onPick,
  onUseBest,
}: {
  st: ReturnType<typeof standing>
  card: Card
  storeName: string
  runner: { card_name: string; advantage_cents: number } | null
  onWhy: () => void
  onPick: () => void
  onUseBest: () => void
}) {
  if (st.kind === 'no-store')
    return (
      <div className="pt-4">
        <p className={`text-[16px] ${muted}`}>Choose a store to see what {card.name} earns there.</p>
        <TextButton onClick={onPick}>Choose a store</TextButton>
      </div>
    )
  if (st.kind === 'rejected')
    return (
      <div className="pt-4">
        <p className={`${serif} text-[40px] leading-[44px] tracking-[-0.4px]`}>Not accepted</p>
        <p className={`pt-1 text-[16px] ${muted}`}>{refusal(card.type, storeName)}.</p>
        <TextButton onClick={onUseBest}>Use the best card instead</TextButton>
      </div>
    )
  const best = st.kind === 'best'
  return (
    <div className="pt-4">
      <div className="flex items-end justify-between gap-3">
        <p className={`${serif} text-[64px] leading-[60px] tracking-[-1px] ${best ? 'text-[#0F7B4A]' : ''}`}>
          +<Money cents={st.value} />
        </p>
        {best ? <TextButton onClick={onWhy}>Why this card</TextButton> : <TextButton onClick={onUseBest}>Switch to {st.bestName}</TextButton>}
      </div>
      <p className="pt-2 text-[15px] leading-[21px]">back on this purchase · {st.short}</p>
      <p className={`text-[15px] leading-[21px] ${muted}`}>
        {best ? (runner ? `${money(runner.advantage_cents)} more than ${runner.card_name}` : 'Nothing in your wallet earns more') : `${st.bestName} earns ${money(st.behindBy)} more here`}
      </p>
    </div>
  )
}

function CardMenu({ onDetails, onRemove }: { onDetails: () => void; onRemove: () => void }) {
  const frame = useFrame()
  const item = 'flex h-11 cursor-default items-center px-4 text-[16px] outline-none select-none data-highlighted:bg-[#141414]/[0.06]'
  return (
    <Menu.Root>
      <Menu.Trigger aria-label="More" className={`grid size-11 place-items-center rounded-full data-popup-open:bg-[#141414]/[0.06] ${focusRing}`}>
        <DotsThreeIcon size={24} weight="bold" />
      </Menu.Trigger>
      <Menu.Portal container={frame}>
        <Menu.Positioner sideOffset={4} align="end" className="z-50 outline-none">
          <Menu.Popup className="min-w-[200px] origin-[var(--transform-origin)] bg-[#FAF9F6] py-1 font-[family-name:var(--font-geist)] text-[#141414] shadow-[0_0_0_0.5px_rgba(20,20,20,0.35),0_12px_30px_-8px_rgba(20,20,20,0.25)] outline-none transition-[scale,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
            <Menu.Item className={item} onClick={onDetails}>
              Card details
            </Menu.Item>
            <Menu.Separator className="mx-4 h-0 border-t-[0.5px] border-[rgba(20,20,20,0.2)]" />
            <Menu.Item className={`${item} text-[#B42318]`} onClick={onRemove}>
              Remove card
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/** A card's best everyday rate, e.g. "4× dining, grocery" or "2% everywhere". */
function headline(card: Card) {
  const unit = (n: number) => (card.reward_type === 'cash' ? `${n}%` : `${n}×`)
  const entries = Object.entries(card.category_rates)
  if (!entries.length) return card.base_rate ? `${unit(card.base_rate)} everywhere` : 'No rewards'
  const top = Math.max(...entries.map(([, v]) => v))
  const cats = entries.filter(([, v]) => v === top).map(([k]) => (categoryLabel[k] ?? k).toLowerCase())
  return `${unit(top)} ${cats.slice(0, 2).join(', ')}`
}
