// Preview (`?preview` in the URL): the app inside an iPhone 14 on a laptop
// screen, for demos. devices.css's iPhone 14 (MIT, iphone-14.css) supplies the
// frame, notch, and buttons; double-clicking the side button opens Pay.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { sideButton } from './frame'
import './iphone-14.css'

// The whole device; its screen (.device-screen) is 388 × 828.
const OUTER = { w: 428, h: 868 }

function useFitScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (innerHeight - 48) / OUTER.h, (innerWidth - 32) / OUTER.w))
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])
  return scale
}

/** `children` is the app's root element, styled as the frame's screen (`device-screen`). */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const scale = useFitScale()
  return (
    <div className="flex h-dvh items-center justify-center bg-[#161618]">
      <div className="device-iphone-14 iphone" style={{ transform: `scale(${scale})` }}>
        <div className="device-frame">
          {children}
        </div>
        <div aria-hidden className="device-stripe" />
        <div aria-hidden className="device-header" />
        <div aria-hidden className="device-sensors" />
        <div aria-hidden className="device-btns" />
        <SideButton />
        <div aria-hidden className="device-home" />
      </div>
    </div>
  )
}

/** The status bar and home indicator, drawn over the app inside the frame's screen. */
export function ScreenChrome() {
  return (
    <>
      <StatusBar />
      <span aria-hidden className="home-indicator bg-white" />
    </>
  )
}

/** The frame's side button. Two presses within 400 ms is a double-click, as on a real iPhone; Enter twice works too. */
function SideButton() {
  const last = useRef(0)
  return (
    <button
      type="button"
      aria-label="Side button, double-click to pay"
      title="Double-click to pay"
      className="device-power side-button"
      onClick={(e) => {
        if (e.timeStamp - last.current < 400) {
          last.current = 0
          sideButton.dispatchEvent(new Event('double-click'))
        } else last.current = e.timeStamp
      }}
    />
  )
}

function StatusBar() {
  return (
    <div aria-hidden className="status-bar text-white">
      <span>9:41</span>
      <span className="status-icons">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.4c2.2 0 4.2.8 5.7 2.2l1.1-1.2A9.9 9.9 0 0 0 8 .7 9.9 9.9 0 0 0 1.2 3.4l1.1 1.2A8.3 8.3 0 0 1 8 2.4Zm0 3.3c1.3 0 2.5.5 3.4 1.3l1.1-1.2A6.6 6.6 0 0 0 8 4a6.6 6.6 0 0 0-4.5 1.8l1.1 1.2c.9-.8 2.1-1.3 3.4-1.3Zm0 3.3c.5 0 .9.2 1.2.5L8 11 6.8 9.5c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  )
}
