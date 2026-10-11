const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/** 4250 -> "$42.50" */
export function formatCents(cents: number): string {
  return usd.format(cents / 100)
}

/** 4250 -> "$42.50" (short alias used by the screens) */
export const money = formatCents

/** 4250 -> "$43", only for large headline figures where cents add noise */
export const moneyWhole = (cents: number) => usdWhole.format(Math.round(cents / 100))

/** 7.2 -> "7.2%", 17.55 -> "17.55%" */
export function formatPct(pct: number): string {
  return `${Number(pct.toFixed(2))}%`
}

/** 7.2 -> "7.2%", 30.41 -> "30%" when `round` */
export const pct = (value: number, round = false) => `${round ? Math.round(value) : Math.round(value * 10) / 10}%`

/** 4 -> "4×" */
export const mult = (m: number) => `${Number.isInteger(m) ? m : m.toFixed(1)}×`

/** Dollars typed by a user ("42.5", "$1,042.50") -> integer cents, or null if invalid. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const cents = Math.round(Number(cleaned) * 100)
  return cents > 0 ? cents : null
}

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
/** "Oct 4" */
export const shortDate = (iso: string) => dayFmt.format(new Date(iso))
/** "Sat" */
export const weekday = (iso: string) => weekdayFmt.format(new Date(iso))

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** "Today", "Yesterday", or "Oct 4", in the device's time zone. */
export function relativeDay(iso: string, now = new Date()) {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return shortDate(iso)
}
