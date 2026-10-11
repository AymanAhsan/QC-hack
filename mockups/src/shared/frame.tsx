import { createContext, useContext, useEffect, useRef } from 'react'

/**
 * The phone frame element. Sheets and menus portal into it, and it carries a
 * transform, so `position: fixed` children are contained by the device rather
 * than the desktop window.
 */
export const FrameContext = createContext<HTMLElement | null>(null)
export const useFrame = () => useContext(FrameContext)

/** The mockup's side button. The harness fires it on a double-click, Apple Pay's shortcut. */
export const sideButton = new EventTarget()

export function useSideButton(onDoubleClick: () => void) {
  const handler = useRef(onDoubleClick)
  handler.current = onDoubleClick
  useEffect(() => {
    const on = () => handler.current()
    sideButton.addEventListener('double-click', on)
    return () => sideButton.removeEventListener('double-click', on)
  }, [])
}
