import { lazy, type ComponentType } from 'react'

// Each design loads on its own, so a broken design only breaks itself.
const NativeApp = lazy(() => import('./native/App').then((m) => ({ default: m.NativeApp })))
const ArcadeApp = lazy(() => import('./arcade/App').then((m) => ({ default: m.ArcadeApp })))
const StickerApp = lazy(() => import('./sticker/App').then((m) => ({ default: m.StickerApp })))
const LoadoutApp = lazy(() => import('./loadout/App').then((m) => ({ default: m.LoadoutApp })))
const LedgerApp = lazy(() => import('./ledger/App').then((m) => ({ default: m.LedgerApp })))

export type DesignEntry = {
  id: string
  name: string
  axis: string
  /** Status bar text color drawn by the harness on desktop. */
  statusBar: 'light' | 'dark'
  /** Device background, so the frame never flashes the wrong color. */
  background: string
  Component: ComponentType
}

const ALL_DESIGNS: DesignEntry[] = [
  { id: 'native', name: 'Native', axis: 'Platform fidelity: Apple Wallet, refined', statusBar: 'light', background: '#000000', Component: NativeApp },
  { id: 'arcade', name: 'Arcade', axis: 'Tactile and chunky: Duolingo-style game UI', statusBar: 'dark', background: '#FFF7EC', Component: ArcadeApp },
  { id: 'sticker', name: 'Sticker', axis: 'Graphic personality: neo-brutalist zine', statusBar: 'dark', background: '#F3EFE6', Component: StickerApp },
  { id: 'loadout', name: 'Loadout', axis: 'Game metaphor: pick your card like a character', statusBar: 'light', background: '#0B0D12', Component: LoadoutApp },
  { id: 'ledger', name: 'Ledger', axis: 'Editorial calm: type-led, list-based', statusBar: 'dark', background: '#FAF9F6', Component: LedgerApp },
]

// The user chose Native (2026-10-10). The others stay reachable with ?all for reference.
const showAll = new URLSearchParams(location.search).has('all')
export const DESIGNS: DesignEntry[] = showAll ? ALL_DESIGNS : ALL_DESIGNS.filter((d) => d.id === 'native')
