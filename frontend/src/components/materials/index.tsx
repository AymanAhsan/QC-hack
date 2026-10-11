// The opened card's live surface: React Bits' Iridescence, tinted from the card's
// own palette. Only the opened card renders it, so there is one live canvas on screen.

import { useReducedMotion } from 'motion/react'
import Iridescence from './Iridescence'

export type Face = { from: string; to: string; glint: string; ink: string; ring: string; mark: 'light' | 'dark' }

const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const

export function mixWithWhite(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * amount))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Tap the card to swirl it; the sheen follows the pointer. Still under reduced motion. */
export function CardMaterial({ face }: { face: Face }) {
  const still = !!useReducedMotion()
  return (
    <div style={fill}>
      <Iridescence color={mixWithWhite(face.to, 0.35)} speed={0.35} amplitude={0.08} brightness={1.15} saturation={0.9} sheen={0.5} stir={0.4} paused={still} />
    </div>
  )
}
