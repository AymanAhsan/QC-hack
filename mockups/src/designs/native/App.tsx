import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform, type TargetAndTransition, type Variants } from 'motion/react'
import { ChartDonutIcon, ContactlessPaymentIcon, ScanIcon, TagIcon, WalletIcon, type Icon } from '@phosphor-icons/react'
import { useSideButton } from '../../shared/frame'
import { useDemoSession } from '../../shared/session'
import { WalletScreen } from './WalletScreen'
import { ScanScreen } from './ScanScreen'
import { DealsScreen } from './DealsScreen'
import { RewardsScreen } from './RewardsScreen'
import { PaySheet } from './PaySheet'
import { ProgressiveBlur } from './skiper'
import { BAR_BOTTOM } from './ui'
import './native.css'

type Tab = 'wallet' | 'scan' | 'deals' | 'rewards'
const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'scan', label: 'Scan', icon: ScanIcon },
  { id: 'deals', label: 'Deals', icon: TagIcon },
  { id: 'rewards', label: 'Rewards', icon: ChartDonutIcon },
]

// Direction-aware tab change, a short slide with a blur (forward = from the right).
const TAB_SLIDE: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28, filter: 'blur(6px)' }),
  // filter must end as 'none': any filter (even blur(0)) would trap the Wallet pile's position: fixed.
  center: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { type: 'spring', duration: 0.38, bounce: 0 }, transitionEnd: { filter: 'none' } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, filter: 'blur(6px)', transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }),
}

// Skiper 99's approach, a one-shot keyframe per icon when its tab is chosen.
const ICON_POP: Record<Tab, TargetAndTransition> = {
  wallet: { y: [0, -5, 0], transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
  scan: { scale: [1, 0.78, 1.1, 1], transition: { duration: 0.45 } },
  deals: { rotate: [0, -15, 5, -2, 0], transition: { duration: 0.5 } },
  rewards: { rotate: [0, -40, 12, 0], transition: { duration: 0.55 } },
}
const ICON_REST: TargetAndTransition = { y: 0, scale: 1, rotate: 0 }

export function NativeApp() {
  const session = useDemoSession()
  const [tab, setTab] = useState<Tab>('wallet')
  const [paying, setPaying] = useState(false)
  // Double-clicking the side button brings up pay from any tab, like Apple Pay.
  useSideButton(() => setPaying((p) => !p))
  const main = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(390)

  useLayoutEffect(() => {
    const el = main.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { scrollY } = useScroll({ container: main })
  // The top blur would soften the header's own buttons at rest, so it fades in as content scrolls under.
  const topBlur = useTransform(scrollY, [0, 24], [0, 1])
  const [dir, setDir] = useState(0)
  const index = TABS.findIndex((t) => t.id === tab)

  const go = (t: Tab) => {
    setDir(Math.sign(TABS.findIndex((x) => x.id === t) - index))
    setTab(t)
    main.current?.scrollTo({ top: 0 })
  }

  return (
    <div
      className="relative flex h-full flex-col bg-[oklch(0.19_0.008_265)] font-[family-name:var(--font-sf)] text-white antialiased [font-feature-settings:'ss01']"
      style={{ ['--n-bar-bottom' as string]: BAR_BOTTOM }}
    >
      <motion.main ref={main} layoutScroll className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[var(--sat)] [scrollbar-width:none]">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={tab} custom={dir} variants={TAB_SLIDE} initial="enter" animate="center" exit="exit">
            {tab === 'wallet' && <WalletScreen session={session} width={width} />}
            {tab === 'scan' && <ScanScreen session={session} onSeeRewards={() => go('rewards')} />}
            {tab === 'deals' && <DealsScreen />}
            {tab === 'rewards' && <RewardsScreen session={session} />}
          </motion.div>
        </AnimatePresence>
      </motion.main>
      <ProgressiveBlur position="top" height="calc(var(--sat) + 40px)" color="rgb(0 0 0 / 0.55)" className="z-10" opacity={topBlur} />
      <ProgressiveBlur position="bottom" height="calc(var(--n-bar-bottom) + 96px)" color="rgb(0 0 0 / 0.5)" className="z-[9]" />
      {/* iOS 26 tab bar: a floating glass capsule; the selection is a lighter pill that slides between tabs. */}
      <nav
        aria-label="Main"
        className="n-glass-bar absolute left-4 right-[86px] bottom-[var(--n-bar-bottom)] z-20 h-[62px] rounded-full p-1"
      >
        <ul className="flex h-full">
          {TABS.map(({ id, label, icon: I }) => {
            const active = tab === id
            return (
              <li key={id} className="relative flex-1">
                {active ? (
                  <motion.span
                    layoutId="n-tab-pill"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-white/[0.13] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_0_0.5px_rgba(255,255,255,0.08)]"
                    transition={{ type: 'spring', visualDuration: 0.42, bounce: 0.18 }}
                  />
                ) : null}
                <motion.button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  whileTap={{ scale: 0.94 }}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-[3px] rounded-full text-[10px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/70 ${
                    active ? 'text-white' : 'text-[rgba(235,235,245,0.6)]'
                  }`}
                >
                  <motion.span className="grid" initial={false} animate={active ? ICON_POP[id] : ICON_REST}>
                    <I size={24} weight={active ? 'fill' : 'regular'} />
                  </motion.span>
                  {label}
                </motion.button>
              </li>
            )
          })}
        </ul>
      </nav>
      {/* Pay sits apart from the tabs, the way iOS 26 floats its search tab in its own circle: it's an action, not a place. */}
      <motion.button
        type="button"
        onClick={() => setPaying(true)}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
        className="n-glass-bar absolute right-4 bottom-[var(--n-bar-bottom)] z-20 flex size-[62px] flex-col items-center justify-center gap-[3px] rounded-full text-[10px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-white/70"
      >
        <ContactlessPaymentIcon size={24} weight="regular" />
        Pay
      </motion.button>
      <PaySheet open={paying} onOpenChange={setPaying} session={session} />
    </div>
  )
}
