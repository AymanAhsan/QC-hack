import NumberFlow from '@number-flow/react'

const currency = { style: 'currency', currency: 'USD' } as const
const usd = new Intl.NumberFormat('en-US', currency)
const usdSigned = new Intl.NumberFormat('en-US', { ...currency, signDisplay: 'exceptZero' })

// NumberFlow draws each digit as its own element, which a screen reader would read
// one by one. So it's hidden from them, and the plain value is there as text instead.

/** Animated currency amount (tabular digits, honors reduced motion). */
export function Money({ cents, className, signed = false }: { cents: number; className?: string; signed?: boolean }) {
  return (
    <span className={className}>
      <span className="sr-only">{(signed ? usdSigned : usd).format(cents / 100)}</span>
      <NumberFlow
        aria-hidden
        value={cents / 100}
        format={{ ...currency, signDisplay: signed ? 'exceptZero' : 'auto' }}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      />
    </span>
  )
}

/** Animated plain number, e.g. a percentage or a streak count. */
export function Count({ value, className, suffix, decimals = 0 }: { value: number; className?: string; suffix?: string; decimals?: number }) {
  return (
    <span className={className}>
      <span className="sr-only">
        {value.toFixed(decimals)}
        {suffix}
      </span>
      <NumberFlow
        aria-hidden
        value={value}
        suffix={suffix}
        format={{ maximumFractionDigits: decimals, minimumFractionDigits: decimals }}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      />
    </span>
  )
}
