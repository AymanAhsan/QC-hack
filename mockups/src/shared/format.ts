const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/** 4250 → "$42.50" */
export const money = (cents: number) => usd.format(cents / 100)
/** 4250 → "$43" (only for large headline figures where cents add noise) */
export const moneyWhole = (cents: number) => usdWhole.format(Math.round(cents / 100))
/** 7.2 → "7.2%", 30.41 → "30%" when `round` */
export const pct = (value: number, round = false) => `${round ? Math.round(value) : Math.round(value * 10) / 10}%`
/** 4 → "4×" */
export const mult = (m: number) => `${Number.isInteger(m) ? m : m.toFixed(1)}×`

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
export const shortDate = (iso: string) => dayFmt.format(new Date(iso))
export const weekday = (iso: string) => weekdayFmt.format(new Date(iso))

/** "Today", "Yesterday", or "Oct 4", relative to the demo's frozen "now". */
export function relativeDay(iso: string, now = DEMO_NOW) {
  const d = Math.floor((Date.parse(now) - Date.parse(iso)) / 86_400_000)
  if (d <= 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return shortDate(iso)
}

/** Data was captured on this day; keep relative labels stable. */
export const DEMO_NOW = '2026-10-10T18:00:00Z'
