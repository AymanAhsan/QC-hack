const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** 4250 -> "$42.50" */
export function formatCents(cents: number): string {
  return usd.format(cents / 100)
}

/** 7.2 -> "7.2%", 17.55 -> "17.55%" */
export function formatPct(pct: number): string {
  return `${Number(pct.toFixed(2))}%`
}

/** Dollars typed by a user ("42.5", "$1,042.50") -> integer cents, or null if invalid. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const cents = Math.round(Number(cleaned) * 100)
  return cents > 0 ? cents : null
}
