// Sound and haptics for the simulated tap-to-pay.
//
// Browsers only allow audio after a user gesture, and the chime fires from a
// timer 1 s after the press. So unlockAudio() runs inside pointerdown, and
// playChime() reuses that already-running AudioContext.
// navigator.vibrate works on Android Chrome; iPhone Safari ignores it.

let audioCtx: AudioContext | null = null

export function unlockAudio(): void {
  try {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    // Audio unavailable
  }
}

/** Three rising sine tones (C5, E5, G5): a short checkout confirmation. */
export function playChime(): void {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    const notes: [freq: number, start: number, end: number, gain: number][] = [
      [523.25, 0, 0.3, 0.3],
      [659.25, 0.15, 0.5, 0.3],
      [783.99, 0.3, 0.7, 0.25],
    ]
    for (const [freq, start, end, peak] of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t0 = ctx.currentTime + start
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t0)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.setValueAtTime(peak, t0)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + end)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(ctx.currentTime + end)
    }
  } catch {
    // Audio unavailable
  }
}

function vibrate(pattern: number | number[]): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    // Vibration unavailable
  }
}

export const vibrateTick = () => vibrate(10)
export const vibrateSuccess = () => vibrate([30, 50, 30])
