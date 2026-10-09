import type { Deal } from '../../types'
import { formatCents, formatPct } from '../../lib/format'

export function DealCard({ deal, best, onOpen }: { deal: Deal; best: boolean; onOpen: () => void }) {
  const code = deal.coupon?.coupon.code
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${deal.merchant.name}: ${deal.headline}. Open in Scan.`}
      className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] p-3 text-left transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-[0.98]"
    >
      <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-2xl">
        {deal.merchant.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{deal.merchant.name}</span>
          {best && <span className="shrink-0 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">TOP STACK</span>}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
          {code ? (
            <span className="rounded-md border border-dashed border-white/30 px-1.5 py-px font-mono font-semibold tracking-wide text-white/85">{code}</span>
          ) : (
            <span>No coupon</span>
          )}
          <span aria-hidden="true">+</span>
          <span>{deal.winner_card_name ?? 'No accepted card'}</span>
        </span>
        <span className="mt-1 block text-xs tabular-nums text-white/40">
          {formatCents(deal.total_value_cents)} on {formatCents(deal.example_subtotal_cents)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-bold tabular-nums text-emerald-300">{formatPct(deal.total_value_pct)}</span>
        <span className="block text-[11px] text-white/45">back</span>
      </span>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
