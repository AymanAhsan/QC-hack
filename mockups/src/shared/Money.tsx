import NumberFlow from '@number-flow/react'

const currency = { style: 'currency', currency: 'USD' } as const

/** Animated currency amount (tabular digits, honors reduced motion). */
export function Money({ cents, className, signed = false }: { cents: number; className?: string; signed?: boolean }) {
  return (
    <NumberFlow
      value={cents / 100}
      format={{ ...currency, signDisplay: signed ? 'exceptZero' : 'auto' }}
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    />
  )
}

/** Animated plain number, e.g. a percentage or a streak count. */
export function Count({ value, className, suffix, decimals = 0 }: { value: number; className?: string; suffix?: string; decimals?: number }) {
  return (
    <NumberFlow
      value={value}
      suffix={suffix}
      format={{ maximumFractionDigits: decimals, minimumFractionDigits: decimals }}
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    />
  )
}
