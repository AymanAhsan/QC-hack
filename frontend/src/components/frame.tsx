import { createContext, useContext, useEffect, useRef } from 'react'

/**
 * The element the app draws into. Sheets and menus portal into it, and it
 * carries a transform, so `position: fixed` children stay inside it (the
 * iPhone frame in preview, or the whole window).
 */
export const FrameContext = createContext<HTMLElement | null>(null)
export const useFrame = () => useContext(FrameContext)

/** "phone": the full-screen phone layout (also inside the preview frame). "wide": the laptop layout with a sidebar. */
export type Layout = 'phone' | 'wide'
export const LayoutContext = createContext<Layout>('phone')
export const useLayout = () => useContext(LayoutContext)

/** The preview frame's side button. The frame fires it on a double-click, Apple Pay's shortcut. */
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
