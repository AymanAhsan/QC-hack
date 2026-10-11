// Free Skiper UI components, adapted.
// Skiper UI by Gurvinder Singh, https://skiper-ui.com: "Free to use and modify in
// both personal and commercial projects. Attribution to Skiper UI is required when
// using the free version." Each export names the Skiper component it comes from.

import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, type MotionValue } from 'motion/react'

// ---------------------------------------------------------------- Skiper 41

/** Skiper 41 Progressive Blur: content blurs and darkens as it scrolls under an edge. */
export function ProgressiveBlur({
  position,
  height,
  offset = '0px',
  color = '#000000',
  blur = '4px',
  className = '',
  opacity,
}: {
  position: 'top' | 'bottom'
  height: string
  /** Distance from the edge, e.g. the tab bar's height for the bottom blur. */
  offset?: string
  color?: string
  blur?: string
  className?: string
  /** Optional, e.g. tied to scroll so the edge only appears once content is under it. */
  opacity?: MotionValue<number>
}) {
  const top = position === 'top'
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 select-none ${className}`}
      style={{
        [top ? 'top' : 'bottom']: offset,
        height,
        background: `linear-gradient(to ${top ? 'top' : 'bottom'}, transparent, ${color})`,
        maskImage: `linear-gradient(to ${top ? 'bottom' : 'top'}, #000 50%, transparent)`,
        WebkitBackdropFilter: `blur(${blur})`,
        backdropFilter: `blur(${blur})`,
        opacity,
      }}
    />
  )
}

// ---------------------------------------------------------------- Skiper 106

/**
 * Skiper 106 Smooth caret input: the native caret is hidden and a drawn caret
 * springs to the measured cursor position. Trimmed to a controlled text input.
 */
export function SmoothInput({
  value,
  onChange,
  className = '',
  ...props
}: Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange'> & { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const measure = useRef<HTMLSpanElement>(null)
  const caretX = useMotionValue(0)
  const caretOpacity = useMotionValue(0)
  const still = useReducedMotion()
  const x = useSpring(caretX, still ? { stiffness: 10000, damping: 100, mass: 0.1 } : { stiffness: 500, damping: 30, mass: 0.5 })

  const place = () => {
    const el = input.current
    const span = measure.current
    if (!el || !span || document.activeElement !== el) return
    const styles = getComputedStyle(el)
    span.style.font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`
    span.style.letterSpacing = styles.letterSpacing
    const at = el.selectionDirection === 'backward' ? (el.selectionStart ?? 0) : (el.selectionEnd ?? 0)
    span.textContent = el.value.slice(0, at)
    const padding = parseFloat(styles.paddingLeft) || 0
    caretX.set((at > 0 ? span.offsetWidth : 0) + padding - el.scrollLeft)
    caretOpacity.set(el.selectionStart === el.selectionEnd ? 1 : 0)
  }
  const placeRef = useRef(place)
  placeRef.current = place

  useEffect(() => {
    placeRef.current()
  }, [value])

  useEffect(() => {
    const onSelection = () => requestAnimationFrame(() => placeRef.current())
    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  }, [])

  return (
    <div className="relative grid" style={{ caretColor: 'transparent' }}>
      <input
        {...props}
        ref={input}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          requestAnimationFrame(() => placeRef.current())
        }}
        onFocus={(e) => {
          props.onFocus?.(e)
          requestAnimationFrame(() => placeRef.current())
        }}
        onBlur={(e) => {
          caretOpacity.set(0)
          props.onBlur?.(e)
        }}
        className={`col-start-1 row-start-1 ${className}`}
      />
      <span ref={measure} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre" />
      <motion.div
        aria-hidden
        className="pointer-events-none col-start-1 row-start-1 h-[1.1em] w-0.5 self-center rounded-full bg-[#0A84FF]"
        style={{ x, opacity: caretOpacity }}
      />
    </div>
  )
}
