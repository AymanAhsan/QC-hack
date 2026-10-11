// Navigation. Phone: a floating glass capsule (iOS 26 tab bar) with Pay in its
// own circle beside it. Laptop: a sidebar with the same tabs and Pay at the bottom.

import { motion, type TargetAndTransition } from 'motion/react'
import { ChartDonutIcon, ContactlessPaymentIcon, ScanIcon, TagIcon, WalletIcon, type Icon } from '@phosphor-icons/react'
import { TABS, type Tab } from '../navigation'

/** How each tab looks. The "missed" tab shows what you earned, so it reads as Rewards. */
const TAB_UI: Record<Tab, { label: string; icon: Icon }> = {
  wallet: { label: 'Wallet', icon: WalletIcon },
  scan: { label: 'Scan', icon: ScanIcon },
  deals: { label: 'Deals', icon: TagIcon },
  missed: { label: 'Rewards', icon: ChartDonutIcon },
}

// Skiper 99's approach, a one-shot keyframe per icon when its tab is chosen.
const ICON_POP: Record<Tab, TargetAndTransition> = {
  wallet: { y: [0, -5, 0], transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
  scan: { scale: [1, 0.78, 1.1, 1], transition: { duration: 0.45 } },
  deals: { rotate: [0, -15, 5, -2, 0], transition: { duration: 0.5 } },
  missed: { rotate: [0, -40, 12, 0], transition: { duration: 0.55 } },
}
const ICON_REST: TargetAndTransition = { y: 0, scale: 1, rotate: 0 }

const pill = 'absolute inset-0 rounded-full bg-white/[0.13] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_0_0.5px_rgba(255,255,255,0.08)]'
const pillSpring = { type: 'spring', visualDuration: 0.42, bounce: 0.18 } as const

export function TabBar({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <nav aria-label="Main" className="n-glass-bar absolute left-4 right-[86px] bottom-[var(--n-bar-bottom)] z-20 h-[62px] rounded-full p-1">
      <ul className="flex h-full">
        {TABS.map(({ id }) => {
          const { label, icon: I } = TAB_UI[id]
          const active = tab === id
          return (
            <li key={id} className="relative flex-1">
              {active ? <motion.span layoutId="tab-pill" aria-hidden className={pill} transition={pillSpring} /> : null}
              <motion.button
                type="button"
                onClick={() => onSelect(id)}
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
  )
}

/** Pay sits apart from the tabs, the way iOS 26 floats its search tab in its own circle: it's an action, not a place. */
export function PayButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
      className="n-glass-bar absolute right-4 bottom-[var(--n-bar-bottom)] z-20 flex size-[62px] flex-col items-center justify-center gap-[3px] rounded-full text-[10px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-white/70"
    >
      <ContactlessPaymentIcon size={24} weight="regular" />
      Pay
    </motion.button>
  )
}

/** Laptop: the tabs as a sidebar, with Pay at the bottom. */
export function SideNav({ tab, onSelect, onPay }: { tab: Tab; onSelect: (tab: Tab) => void; onPay: () => void }) {
  return (
    <nav aria-label="Main" className="flex w-[248px] shrink-0 flex-col border-r-[0.5px] border-white/10 px-3 pb-5 pt-6">
      <div className="flex items-center gap-2.5 px-3 pb-7">
        <img src="/icon.svg" alt="" width={30} height={30} className="rounded-[8px] outline-1 -outline-offset-1 outline-white/10" />
        <span className="font-[family-name:var(--font-sf-rounded)] text-[20px] font-bold">CreditMaxx</span>
      </div>
      <ul className="space-y-1">
        {TABS.map(({ id }) => {
          const { label, icon: I } = TAB_UI[id]
          const active = tab === id
          return (
            <li key={id} className="relative">
              {active ? <motion.span layoutId="side-pill" aria-hidden className={`${pill} rounded-[14px]`} transition={pillSpring} /> : null}
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-white/70 ${
                  active ? 'text-white' : 'text-[rgba(235,235,245,0.6)] hover:text-white'
                }`}
              >
                <motion.span className="grid" initial={false} animate={active ? ICON_POP[id] : ICON_REST}>
                  <I size={22} weight={active ? 'fill' : 'regular'} />
                </motion.span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
      <span className="flex-1" />
      <motion.button
        type="button"
        onClick={onPay}
        whileTap={{ scale: 0.97 }}
        className="n-glass flex h-12 items-center justify-center gap-2 rounded-full text-[17px] font-semibold focus-visible:outline-2 focus-visible:outline-white/70"
      >
        <ContactlessPaymentIcon size={22} />
        Pay
      </motion.button>
    </nav>
  )
}
