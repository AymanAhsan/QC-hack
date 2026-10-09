// Small shared UI pieces for every screen.

import type { ReactNode } from 'react'
import { ApiError } from '../api'

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="pb-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-white/55">{subtitle}</p>}
    </header>
  )
}

/** "Demo data" pill. Use wherever simulated payments, coupons, or history appear. */
export function DemoBadge({ children = 'Demo data' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
      {children}
    </span>
  )
}

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError
      ? error.isNotImplemented
        ? `${error.message} (waiting on another workstream)`
        : error.message
      : 'Something went wrong.'
  return (
    <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-full bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20">
          Try again
        </button>
      )}
    </div>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="animate-pulse py-8 text-center text-sm text-white/50">
      {label}
    </p>
  )
}
