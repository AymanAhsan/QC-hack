import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion, useScroll, useTransform, type Variants } from 'motion/react'
import { NavProvider, TABS, useNav, type Tab } from './navigation'
import { LocationProvider } from './location'
import { useSession, type Session } from './session'
import { FrameContext, LayoutContext, useSideButton, type Layout } from './components/frame'
import { PayButton, SideNav, TabBar } from './components/TabBar'
import { PhoneFrame, ScreenChrome } from './components/PhoneFrame'
import { ProgressiveBlur } from './components/skiper'
import { registerConfettiCanvas } from './lib/confetti'
import { WalletScreen } from './screens/wallet/WalletScreen'
import { PaySheet } from './screens/wallet/PaySheet'
import { ScanScreen } from './screens/scan/ScanScreen'
import { DealsScreen } from './screens/deals/DealsScreen'
import { RewardsScreen } from './screens/missed/RewardsScreen'

/** The floating tab bar's distance from the bottom edge (it clears the home indicator). */
const BAR_BOTTOM = 'max(12px, calc(var(--sab) - 5px))'

// Direction-aware tab change, a short slide with a blur (forward = from the right).
const TAB_SLIDE: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28, filter: 'blur(6px)' }),
  // filter must end as 'none': any filter (even blur(0)) would trap position: fixed children.
  center: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { type: 'spring', duration: 0.38, bounce: 0 }, transitionEnd: { filter: 'none' } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, filter: 'blur(6px)', transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }),
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** Phone: tab bar. Laptop (>= 1024 px): sidebar. `?preview`: the phone layout inside an iPhone frame. */
function Root() {
  const preview = new URLSearchParams(location.search).has('preview')
  const small = useMedia('(max-width: 519px)')
  const wide = useMedia('(min-width: 1024px)')

  if (preview && !small) {
    return (
      <PhoneFrame>
        <Screen layout="phone" className="device device-screen" style={{ ['--sat' as string]: '47px', ['--sab' as string]: '26px' }}>
          <ScreenChrome />
        </Screen>
      </PhoneFrame>
    )
  }
  return (
    <Screen
      layout={wide ? 'wide' : 'phone'}
      className="device h-dvh w-full"
      style={{ ['--sat' as string]: wide ? '0px' : 'max(12px, env(safe-area-inset-top, 0px))', ['--sab' as string]: 'env(safe-area-inset-bottom, 0px)' }}
    />
  )
}

/**
 * The element the app draws into: sheets portal here and `position: fixed` stays inside it
 * (it carries a transform), so the same app works full screen and inside the preview frame.
 */
function Screen({ layout, className, style, children }: { layout: Layout; className: string; style: CSSProperties; children?: ReactNode }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)
  return (
    <div
      ref={setFrame}
      data-layout={layout}
      className={`${className} bg-[oklch(0.19_0.008_265)] font-[family-name:var(--font-sf)] text-white antialiased [font-feature-settings:'ss01']`}
      style={{ ...style, transform: 'translateZ(0)', ['--n-bar-bottom' as string]: BAR_BOTTOM }}
    >
      <LayoutContext.Provider value={layout}>
        <FrameContext.Provider value={frame}>{frame ? <Shell layout={layout} /> : null}</FrameContext.Provider>
      </LayoutContext.Provider>
      {children}
      <canvas ref={registerConfettiCanvas} aria-hidden className="confetti-canvas" />
    </div>
  )
}

function Shell({ layout }: { layout: Layout }) {
  const nav = useNav()
  const session = useSession()
  const [paying, setPaying] = useState(false)
  // Double-clicking the preview frame's side button brings up Pay from any tab, like Apple Pay.
  useSideButton(() => setPaying((p) => !p))
  const main = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(390)
  const [dir, setDir] = useState(0)

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

  const go = (t: Tab) => {
    const index = TABS.findIndex((x) => x.id === nav.tab)
    setDir(Math.sign(TABS.findIndex((x) => x.id === t) - index))
    nav.setTab(t)
    main.current?.scrollTo({ top: 0 })
  }

  const screen = (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div key={nav.tab} custom={dir} variants={TAB_SLIDE} initial="enter" animate="center" exit="exit">
        <TabScreen tab={nav.tab} session={session} width={width} onSeeRewards={() => go('missed')} />
      </motion.div>
    </AnimatePresence>
  )

  return (
    <MotionConfig reducedMotion="user">
      {layout === 'wide' ? (
        <div className="flex h-full">
          <SideNav tab={nav.tab} onSelect={go} onPay={() => setPaying(true)} />
          <motion.main ref={main} layoutScroll className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-[1080px] px-6 pb-16 pt-8">{screen}</div>
          </motion.main>
        </div>
      ) : (
        <div className="relative flex h-full flex-col">
          <motion.main ref={main} layoutScroll className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[var(--sat)] [scrollbar-width:none]">
            {screen}
          </motion.main>
          <ProgressiveBlur position="top" height="calc(var(--sat) + 40px)" color="rgb(0 0 0 / 0.55)" className="z-10" opacity={topBlur} />
          <ProgressiveBlur position="bottom" height="calc(var(--n-bar-bottom) + 96px)" color="rgb(0 0 0 / 0.5)" className="z-[9]" />
          <TabBar tab={nav.tab} onSelect={go} />
          <PayButton onClick={() => setPaying(true)} />
        </div>
      )}
      <SaveFailure session={session} />
      <PaySheet open={paying} onOpenChange={setPaying} session={session} />
    </MotionConfig>
  )
}

function TabScreen({ tab, session, width, onSeeRewards }: { tab: Tab; session: Session; width: number; onSeeRewards: () => void }) {
  switch (tab) {
    case 'wallet':
      return <WalletScreen session={session} width={width} />
    case 'scan':
      return <ScanScreen session={session} onSeeRewards={onSeeRewards} />
    case 'deals':
      return <DealsScreen session={session} />
    case 'missed':
      return <RewardsScreen session={session} />
  }
}

/** A purchase that didn't reach the server: say so where it can't be missed, and offer to try again. */
function SaveFailure({ session }: { session: Session }) {
  const f = session.saveFailure
  return (
    <AnimatePresence>
      {f ? (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          className="n-sheet absolute inset-x-4 bottom-[calc(var(--n-bar-bottom)+74px)] z-50 flex items-center gap-3 rounded-[20px] py-2 pl-4 pr-2 text-[15px] wide:inset-x-auto wide:bottom-6 wide:right-6 wide:w-[380px]"
        >
          <p className="min-w-0 flex-1">Couldn’t save your {f.merchantName} purchase.</p>
          <button type="button" onClick={f.retry} className="min-h-11 shrink-0 px-2 font-semibold text-[#0A84FF]">
            Try again
          </button>
          <button type="button" onClick={session.dismissSaveFailure} aria-label="Dismiss" className="grid size-11 shrink-0 place-items-center text-white/60">
            ×
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <NavProvider>
      {/* Above the screens so the location check runs at startup, not when Wallet opens. */}
      <LocationProvider>
        <Root />
      </LocationProvider>
    </NavProvider>
  )
}
