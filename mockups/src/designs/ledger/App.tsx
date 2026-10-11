import { useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useDemoSession } from '../../shared/session'
import { WalletScreen } from './WalletScreen'
import { ScanScreen } from './ScanScreen'
import { DealsScreen } from './DealsScreen'
import { RewardsScreen } from './RewardsScreen'

type Tab = 'wallet' | 'scan' | 'deals' | 'rewards'
const TABS: { id: Tab; label: string }[] = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'scan', label: 'Scan' },
  { id: 'deals', label: 'Deals' },
  { id: 'rewards', label: 'Rewards' },
]

export function LedgerApp() {
  const session = useDemoSession()
  const [tab, setTab] = useState<Tab>('wallet')
  const main = useRef<HTMLElement>(null)
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
    <div className="relative flex h-full flex-col bg-[#FAF9F6] font-[family-name:var(--font-geist)] text-[#141414] antialiased selection:bg-[#0F7B4A]/20">
      <motion.main ref={main} layoutScroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[var(--sat)] [scrollbar-width:none]">
        {tab === 'wallet' && <WalletScreen session={session} width={width} />}
        {tab === 'scan' && <ScanScreen session={session} onSeeRewards={() => go('rewards')} />}
        {tab === 'deals' && <DealsScreen />}
        {tab === 'rewards' && <RewardsScreen session={session} />}
      </motion.main>

      {/* Paper fades in under the status bar so scrolled text never collides with it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(var(--sat)+10px)] bg-[#FAF9F6]/85 backdrop-blur-sm [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
      />

      <nav aria-label="Main" className="absolute inset-x-0 bottom-0 z-20 border-t-[0.5px] border-[rgba(20,20,20,0.25)] bg-[#FAF9F6]/92 pb-[var(--sab)] backdrop-blur-md">
        <ul className="flex px-3">
          {TABS.map(({ id, label }) => {
            const active = tab === id
            return (
              <li key={id} className="flex-1">
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-[52px] w-full items-center justify-center text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#141414] ${
                    active ? 'text-[#141414]' : 'text-[#5E5D58]'
                  }`}
                >
                  {label}
                  {active ? (
                    <motion.span
                      layoutId="l-tab-underline"
                      className="absolute inset-x-0 bottom-2.5 mx-auto h-[2px] w-7 rounded-full bg-[#141414]"
                      transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                    />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
