import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChartBarIcon, ScanIcon, TagIcon, TrophyIcon, WalletIcon, type Icon } from '@phosphor-icons/react'
import { useDemoSession, type DemoSession } from '../../shared/session'
import { WalletScreen } from './WalletScreen'
import { ScanScreen } from './ScanScreen'
import { DealsScreen } from './DealsScreen'
import { RewardsScreen } from './RewardsScreen'
import { Label } from './ui'

type Tab = 'wallet' | 'scan' | 'deals' | 'rewards'
const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'scan', label: 'Scan', icon: ScanIcon },
  { id: 'deals', label: 'Deals', icon: TagIcon },
  { id: 'rewards', label: 'Rewards', icon: ChartBarIcon },
]

export function LoadoutApp() {
  const session = useDemoSession()
  const [tab, setTab] = useState<Tab>('wallet')
  const main = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(390)

  useLayoutEffect(() => {
    const el = main.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const go = (t: Tab) => {
    setTab(t)
    main.current?.scrollTo({ top: 0 })
  }

  return (
    <div className="relative flex h-full flex-col bg-[#0B0D12] font-[family-name:var(--font-grotesk)] text-[#EEF0F4] antialiased">
      <motion.main ref={main} layoutScroll className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-[var(--sat)] [scrollbar-width:none]">
        {tab === 'wallet' && <WalletScreen session={session} width={width} />}
        {tab === 'scan' && <ScanScreen session={session} onSeeRewards={() => go('rewards')} />}
        {tab === 'deals' && <DealsScreen />}
        {tab === 'rewards' && <RewardsScreen session={session} />}
      </motion.main>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(var(--sat)+12px)] bg-[#0B0D12]/80 backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
      />

      <Achievements session={session} />

      <nav aria-label="Main" className="absolute inset-x-0 bottom-0 z-20 bg-[#0B0D12]/85 pb-[var(--sab)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
        <ul className="flex px-2">
          {TABS.map(({ id, label, icon: I }) => {
            const active = tab === id
            return (
              <li key={id} className="relative flex-1">
                {active ? (
                  <motion.span
                    layoutId="lo-tab-line"
                    className="absolute left-1/2 top-0 h-[2px] w-8 -translate-x-1/2 rounded-full bg-[#EEF0F4]"
                    transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-[54px] w-full flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-[0.02em] transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#EEF0F4] ${
                    active ? 'text-[#EEF0F4]' : 'text-[#8A93A2]'
                  }`}
                >
                  <I size={22} weight={active ? 'fill' : 'regular'} />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

type Unlock = { id: string; title: string; detail: string }

/**
 * Console-style achievement toasts. Only real decisions unlock them: best-card
 * picks, streaks, stacking a coupon. Nothing is ever earned by spending more.
 */
function Achievements({ session }: { session: DemoSession }) {
  const seen = useRef(new Set<string>())
  const lastCount = useRef(0)
  const [queue, setQueue] = useState<Unlock[]>([])
  const current = queue[0]

  useEffect(() => {
    const { logged, stats } = session
    if (logged.length === lastCount.current) return
    lastCount.current = logged.length
    const tx = logged[0]
    if (!tx) return
    const found: Unlock[] = []
    const add = (u: Unlock) => {
      if (seen.current.has(u.id)) return
      seen.current.add(u.id)
      found.push(u)
    }
    if (tx.missed_cents === 0) add({ id: 'first-max', title: 'Perfect pick', detail: 'Paid with the best card for the store' })
    if (stats.streak >= 3) add({ id: 'streak-3', title: '3 in a row', detail: 'Three best-card picks back to back' })
    if (stats.streak >= 5) add({ id: 'streak-5', title: '5 in a row', detail: 'Five best-card picks back to back' })
    if (tx.coupon_code && tx.missed_cents === 0) add({ id: 'stack', title: 'Full stack', detail: `${tx.coupon_code} plus the best card on one order` })
    if (found.length) setQueue((q) => [...q, ...found])
  }, [session])

  useEffect(() => {
    if (!current) return
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3200)
    return () => clearTimeout(t)
  }, [current])

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--sat)+6px)] z-30 flex justify-center px-4" aria-live="polite">
      <AnimatePresence mode="wait">
        {current ? (
          <motion.button
            key={current.id}
            type="button"
            onClick={() => setQueue((q) => q.slice(1))}
            className="pointer-events-auto flex w-full max-w-[340px] items-center gap-3 rounded-[16px] bg-[#1A1E27]/95 p-3 pr-4 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -90, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.22 }}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#9BE36D] text-[#0B0D12]">
              <TrophyIcon size={22} weight="fill" />
            </span>
            <span className="min-w-0">
              <Label>Unlocked</Label>
              <span className="block truncate text-[16px] font-semibold leading-[20px]">{current.title}</span>
              <span className="block truncate text-[13px] text-[#9BA3B1]">{current.detail}</span>
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
