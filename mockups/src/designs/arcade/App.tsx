import { useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ChartDonutIcon, ScanIcon, TagIcon, WalletIcon, type Icon } from '@phosphor-icons/react'
import { useDemoSession } from '../../shared/session'
import { WalletScreen } from './WalletScreen'
import { ScanScreen } from './ScanScreen'
import { DealsScreen } from './DealsScreen'
import { RewardsScreen } from './RewardsScreen'
import './arcade.css'

export type Tab = 'wallet' | 'scan' | 'deals' | 'rewards'
const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'scan', label: 'Scan', icon: ScanIcon },
  { id: 'deals', label: 'Deals', icon: TagIcon },
  { id: 'rewards', label: 'Rewards', icon: ChartDonutIcon },
]

export function ArcadeApp() {
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
    <div className="arcade relative flex h-full flex-col bg-[#FFF7EC] font-[family-name:var(--font-nunito)] text-[#1F1F1F] antialiased">
      <motion.main ref={main} layoutScroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[var(--sat)] [scrollbar-width:none]">
        {tab === 'wallet' && <WalletScreen session={session} width={width} onRewards={() => go('rewards')} />}
        {tab === 'scan' && <ScanScreen session={session} onRewards={() => go('rewards')} />}
        {tab === 'deals' && <DealsScreen session={session} onRewards={() => go('rewards')} />}
        {tab === 'rewards' && <RewardsScreen session={session} />}
      </motion.main>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(var(--sat)+12px)] bg-[#FFF7EC] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
      />
      <nav aria-label="Main" className="absolute inset-x-0 bottom-0 z-20 border-t-2 border-[#EADFCC] bg-white pb-[var(--sab)]">
        <ul className="flex px-2 pt-1.5">
          {TABS.map(({ id, label, icon: I }) => {
            const active = tab === id
            return (
              <li key={id} className="flex-1">
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex h-[54px] w-full flex-col items-center justify-center gap-0.5 rounded-[16px] text-[12px] font-extrabold outline-offset-[-2px] focus-visible:outline-[3px] focus-visible:outline-[#1F1F1F] ${
                    active ? 'text-[#0B7D4D]' : 'text-[#8A8075]'
                  }`}
                >
                  <span className="relative grid h-8 w-14 place-items-center transition-transform duration-150 group-active:scale-[0.92]">
                    {active ? (
                      <motion.span layoutId="arcade-tab" className="absolute inset-0 rounded-full bg-[#E3F7EC]" transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }} />
                    ) : null}
                    <I size={26} weight={active ? 'fill' : 'bold'} className="relative" />
                  </span>
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
