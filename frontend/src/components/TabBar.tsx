import { TABS, useNav, type Tab } from '../navigation'

const ICONS: Record<Tab, string> = {
  wallet: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M7 15h4',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  deals: 'M20 12l-8 8-8-8V4h8zM8 8h.01',
  missed: 'M3 17l6-6 4 4 8-8M15 7h6v6',
}

export function TabBar() {
  const { tab, setTab } = useNav()
  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t border-white/10 bg-black/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
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
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={ICONS[id]} />
                </svg>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
