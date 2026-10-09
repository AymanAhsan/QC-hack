// Shared navigation contract. Screens never import each other; they use this hook.
//
//   const nav = useNav()
//   nav.setTab('missed')
//   nav.openScan({ merchantId: 'nike' })          // Deals -> Scan
//   nav.scanIntent                                 // Scan reads this on mount/change
//   nav.clearScanIntent()                          // Scan clears it once applied
//   nav.notifyTransactionLogged()                  // after a successful POST /api/transactions
//   nav.transactionsVersion                        // Missed refetches when this changes

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Tab = 'wallet' | 'scan' | 'deals' | 'missed'

export const TABS: { id: Tab; label: string }[] = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'scan', label: 'Scan' },
  { id: 'deals', label: 'Deals' },
  { id: 'missed', label: 'Missed' },
]

export interface ScanIntent {
  merchantId?: string
  merchantName?: string
  subtotalCents?: number
  /** Increments on every openScan call so re-opening the same merchant still triggers. */
  nonce: number
}

interface NavValue {
  tab: Tab
  setTab: (tab: Tab) => void
  scanIntent: ScanIntent | null
  openScan: (intent: Omit<ScanIntent, 'nonce'>) => void
  clearScanIntent: () => void
  transactionsVersion: number
  notifyTransactionLogged: () => void
}

const NavContext = createContext<NavValue | null>(null)

export function NavProvider({ children, initialTab = 'wallet' }: { children: ReactNode; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [scanIntent, setScanIntent] = useState<ScanIntent | null>(null)
  const [transactionsVersion, setTransactionsVersion] = useState(0)

  const openScan = useCallback((intent: Omit<ScanIntent, 'nonce'>) => {
    setScanIntent((prev) => ({ ...intent, nonce: (prev?.nonce ?? 0) + 1 }))
    setTab('scan')
  }, [])
  const clearScanIntent = useCallback(() => setScanIntent(null), [])
  const notifyTransactionLogged = useCallback(() => setTransactionsVersion((v) => v + 1), [])

  const value = useMemo(
    () => ({ tab, setTab, scanIntent, openScan, clearScanIntent, transactionsVersion, notifyTransactionLogged }),
    [tab, scanIntent, openScan, clearScanIntent, transactionsVersion, notifyTransactionLogged],
  )
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav(): NavValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used inside <NavProvider>')
  return ctx
}
