import confetti from 'canvas-confetti'

// One confetti canvas lives inside the phone frame (the harness registers it),
// so bursts stay inside the device instead of covering the desktop page.
let fire: confetti.CreateTypes | null = null

export function registerConfettiCanvas(canvas: HTMLCanvasElement | null) {
  fire?.reset()
  fire = canvas ? confetti.create(canvas, { resize: true, useWorker: false, disableForReducedMotion: true }) : null
}

type Burst = {
  colors: string[]
  /** 0–1 within the device, default just above center */
  origin?: { x: number; y: number }
  /** small: a pop for a good choice. big: a milestone. */
  size?: 'small' | 'big'
  shapes?: confetti.Shape[]
  scalar?: number
  /** Particle count for a small burst (default 36). */
  count?: number
}

export function celebrate({ colors, origin = { x: 0.5, y: 0.42 }, size = 'small', shapes, scalar, count = 36 }: Burst) {
  if (!fire) return
  const base = { origin, colors, shapes, scalar, disableForReducedMotion: true, zIndex: 0 }
  if (size === 'small') {
    void fire({ ...base, particleCount: count, spread: 70, startVelocity: 32, gravity: 1.1, ticks: 160 })
    return
  }
  void fire({ ...base, particleCount: 90, spread: 100, startVelocity: 46, gravity: 1, ticks: 260 })
  setTimeout(() => {
    void fire?.({ ...base, particleCount: 40, angle: 60, spread: 60, startVelocity: 50, origin: { x: 0, y: 0.7 } })
    void fire?.({ ...base, particleCount: 40, angle: 120, spread: 60, startVelocity: 50, origin: { x: 1, y: 0.7 } })
  }, 160)
}
