import { NavProvider, useNav, type Tab } from './navigation'
import { LocationProvider } from './location'
import { SideNav, TabBar } from './components/TabBar'
import { DevStatus } from './components/DevStatus'
import { WalletScreen } from './screens/wallet/WalletScreen'
import { ScanScreen } from './screens/scan/ScanScreen'
import { DealsScreen } from './screens/deals/DealsScreen'
import { MissedScreen } from './screens/missed/MissedScreen'

// Only the active screen is mounted, so leaving a tab unmounts it and its timers.
const SCREENS: Record<Tab, () => React.JSX.Element> = {
  wallet: WalletScreen,
  scan: ScanScreen,
  deals: DealsScreen,
  missed: MissedScreen,
}

function Shell() {
  const { tab } = useNav()
  const Screen = SCREENS[tab]
  return (
    // Phone: content column + bottom tab bar. Desktop (lg, >= 1024 px): sidebar + wide content.
    <div className="flex h-dvh flex-col bg-black text-white lg:flex-row">
      <DevStatus />
      <SideNav />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)]">
        <div className="mx-auto w-full max-w-md px-4 pb-6 md:max-w-2xl lg:max-w-6xl lg:px-10 lg:pb-10">
          <Screen key={tab} />
        </div>
      </main>
      <TabBar />
    </div>
  )
}

export default function App() {
  return (
    <NavProvider>
      {/* Above the screens so the location check runs at startup, not when Wallet opens. */}
      <LocationProvider>
        <Shell />
      </LocationProvider>
    </NavProvider>
  )
}
