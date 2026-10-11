// Sound and haptics. Audio must be unlocked inside a user gesture (pointerdown),
// so every press handler calls unlockAudio() before anything plays later.
// navigator.vibrate works on Android Chrome only; iPhone Safari ignores it, so
// nothing here may be the only signal of success.

let ctx: AudioContext | null = null

export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Audio unavailable
  }
}

function tone(freq: number, start: number, end: number, peak: number, type: OscillatorType = 'sine') {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const t0 = ctx.currentTime + start
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + end)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(ctx.currentTime + end + 0.05)
}

/** Three rising notes (C5 E5 G5): payment done. */
export function playChime() {
  unlockAudio()
  tone(523.25, 0, 0.3, 0.22)
  tone(659.25, 0.12, 0.45, 0.22)
  tone(783.99, 0.24, 0.8, 0.2)
}

/** Brighter arpeggio for a best-card streak milestone. */
export function playFanfare() {
  unlockAudio()
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, i * 0.09 + 0.5, 0.16, 'triangle'))
}

/** Tiny tick for selection changes. */
export function playTick() {
  unlockAudio()
  tone(1400, 0, 0.04, 0.05, 'square')
}

export function vibrate(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    // Vibration unavailable
  }
}
