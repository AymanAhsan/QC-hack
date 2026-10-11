import { animate, useMotionValue, type AnimationPlaybackControls } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unlockAudio, vibrate } from './feedback'

export type HoldState = 'idle' | 'holding' | 'done'

/**
 * Press-and-hold to confirm. The fill is linear (it shows time passing, and
 * time passes linearly); letting go early snaps back fast with a strong
 * ease-out. Works with pointer, Space, and Enter. The fill is driven by a
 * motion value, so it still runs under reduced motion: it is the feedback.
 */
export function useHoldToPay({
  duration = 1.2,
  disabled = false,
  onComplete,
}: {
  duration?: number
  disabled?: boolean
  onComplete: () => void
}) {
  const progress = useMotionValue(0)
  const [state, setState] = useState<HoldState>('idle')
  const stateRef = useRef<HoldState>('idle')
  const anim = useRef<AnimationPlaybackControls | null>(null)
  const done = useRef(onComplete)
  done.current = onComplete

  const set = (s: HoldState) => {
    stateRef.current = s
    setState(s)
  }

  const start = useCallback(() => {
    if (disabled || stateRef.current !== 'idle') return
    unlockAudio()
    vibrate(8)
    set('holding')
    anim.current?.stop()
    anim.current = animate(progress, 1, {
      duration: duration * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => {
        if (stateRef.current !== 'holding') return
        set('done')
        vibrate([30, 50, 30])
        done.current()
      },
    })
  }, [disabled, duration, progress])

  const cancel = useCallback(() => {
    if (stateRef.current !== 'holding') return
    anim.current?.stop()
    set('idle')
    anim.current = animate(progress, 0, { duration: 0.2, ease: [0.23, 1, 0.32, 1] })
  }, [progress])

  const reset = useCallback(() => {
    anim.current?.stop()
    progress.set(0)
    set('idle')
  }, [progress])

  useEffect(() => () => anim.current?.stop(), [])

  const isKey = (e: React.KeyboardEvent) => e.key === ' ' || e.key === 'Enter'

  const bind = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      start()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!isKey(e)) return
      e.preventDefault()
      if (!e.repeat) start()
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (isKey(e)) cancel()
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties,
  }

  return { progress, state, bind, reset }
}
