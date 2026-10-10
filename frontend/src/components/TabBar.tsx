import { TABS, useNav, type Tab } from '../navigation'

const ICONS: Record<Tab, string> = {
  wallet: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M7 15h4',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  deals: 'M20 12l-8 8-8-8V4h8zM8 8h.01',
  missed: 'M3 17l6-6 4 4 8-8M15 7h6v6',
}

const HINTS: Record<Tab, string> = {
  wallet: 'Best card in store',
  scan: 'Cart + coupon stack',
  deals: "Today's best stacks",
  missed: 'Rewards left behind',
}

function Icon({ tab }: { tab: Tab }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[tab]} />
    </svg>
  )
}

/** Phone and tablet: bottom tab bar. Hidden on desktop, where SideNav takes over. */
export function TabBar() {
  const { tab, setTab } = useNav()
  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t border-white/10 bg-black/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ id, label }) => {
          const active = id === tab
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-sky-400 ${
                  active ? 'text-white' : 'text-white/45 hover:text-white/70'
                }`}
              >
                <Icon tab={id} />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Desktop: left sidebar with the same four destinations. */
export function SideNav() {
  const { tab, setTab } = useNav()
  return (
    <nav aria-label="Main" className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0a0a0a] px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
        <div>
          <p className="text-lg font-bold tracking-tight">CardMax</p>
          <p className="text-xs text-white/45">Credit card optimizer</p>
        </div>
      </div>
      <ul className="space-y-1">
        {TABS.map(({ id, label }) => {
          const active = id === tab
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                  active ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/85'
                }`}
              >
                <Icon tab={id} />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-white/40">{HINTS[id]}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-auto rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2.5 text-xs leading-relaxed text-amber-100/70">
        Demo app. Cards, stores, coupons, payments, and history are simulated. No real card is ever charged.
      </p>
    </nav>
  )
}
