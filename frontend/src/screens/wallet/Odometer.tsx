// Rolling-digit number: every digit column scrolls to its value, starting from 0.

import { useEffect, useState } from 'react'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function Odometer({ value, decimals = 1, suffix = '%', className = '' }: { value: number; decimals?: number; suffix?: string; className?: string }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setShown(value), 120)
    return () => clearTimeout(t)
  }, [value])

  const text = shown.toFixed(decimals)
  return (
    <span className={`inline-flex items-center font-mono font-bold tabular-nums leading-none ${className}`} aria-label={`${value.toFixed(decimals)}${suffix}`}>
      {text.split('').map((ch, i) =>
        ch === '.' ? (
          <span key={`dot-${i}`} aria-hidden="true">.</span>
        ) : (
          <span key={`d-${text.length - i}`} aria-hidden="true" className="inline-block h-[1em] overflow-hidden">
            <span
              className="flex flex-col transition-transform duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: `translateY(-${Number(ch)}em)` }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1em] leading-none">{d}</span>
              ))}
            </span>
          </span>
        ),
      )}
      <span aria-hidden="true">{suffix}</span>
    </span>
  )
}
