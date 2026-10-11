import { useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ChartBarIcon, ScanIcon, TagIcon, WalletIcon, type Icon } from '@phosphor-icons/react'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import { useDemoSession } from '../../shared/session'
import { WalletScreen } from './WalletScreen'
import { ScanScreen } from './ScanScreen'
import { DealsScreen } from './DealsScreen'
import { RewardsScreen } from './RewardsScreen'
import { FONT, RoughFilter } from './ui'

type Tab = 'wallet' | 'scan' | 'deals' | 'rewards'
const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'scan', label: 'Scan', icon: ScanIcon },
  { id: 'deals', label: 'Deals', icon: TagIcon },
  { id: 'rewards', label: 'Rewards', icon: ChartBarIcon },
]

export function StickerApp() {
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
    <div className={`${FONT} relative flex h-full flex-col bg-[#F3EFE6] text-[#111] antialiased`}>
      <RoughFilter />
      <motion.main ref={main} layoutScroll className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-[var(--sat)] [scrollbar-width:none]">
        {tab === 'wallet' && <WalletScreen session={session} width={width} />}
        {tab === 'scan' && <ScanScreen session={session} onSeeRewards={() => go('rewards')} />}
        {tab === 'deals' && <DealsScreen />}
        {tab === 'rewards' && <RewardsScreen session={session} />}
      </motion.main>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(var(--sat)+12px)] bg-[#F3EFE6] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
      />
      <nav aria-label="Main" className="absolute inset-x-0 bottom-0 z-20 border-t-2 border-[#111] bg-[#F3EFE6] px-2 pb-[var(--sab)] pt-1.5">
        <ul className="flex">
          {TABS.map(({ id, label, icon: I }) => {
            const active = tab === id
            return (
              <li key={id} className="flex-1">
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  className="relative flex h-[50px] w-full flex-col items-center justify-center gap-0.5 rounded-[12px] text-[12px] font-extrabold outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[#111]"
                >
                  {active ? (
                    <motion.span
                      layoutId="stk-tab"
                      className="absolute inset-x-1.5 inset-y-0.5 rounded-[12px] border-2 border-[#111] bg-[#FF5B1F] shadow-[2px_2px_0_#111]"
                      transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
                    />
                  ) : null}
                  <I size={22} weight={active ? 'fill' : 'bold'} className="relative" />
                  <span className="relative">{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
