import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { DESIGNS } from '../designs/registry'
import { FrameContext, sideButton } from '../shared/frame'
import { registerConfettiCanvas } from '../shared/confetti'
import './picker.css'
import './iphone-14.css'

// The screen inside devices.css's iPhone 14 mockup (iphone-14.css), and the whole device around it.
const DEVICE = { w: 388, h: 828 }
const OUTER = { w: 428, h: 868 }

function initialIndex() {
  const v = parseInt(new URLSearchParams(location.search).get('v') ?? '', 10)
  return v >= 1 && v <= DESIGNS.length ? v - 1 : 0
}

export function Harness() {
  const [current, setCurrent] = useState(initialIndex)
  const [mountKey, setMountKey] = useState(0)

  const select = useCallback((i: number) => {
    if (i < 0 || i >= DESIGNS.length) return
    setCurrent(i)
    setMountKey((k) => k + 1)
    const url = new URL(location.href)
    url.searchParams.set('v', String(i + 1))
    history.replaceState(null, '', url)
  }, [])

  const replay = useCallback(() => setMountKey((k) => k + 1), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= DESIGNS.length) select(num - 1)
      else if (e.key === 'ArrowRight') select((current + 1) % DESIGNS.length)
      else if (e.key === 'ArrowLeft') select((current - 1 + DESIGNS.length) % DESIGNS.length)
      else if (e.key === 'r' || e.key === 'R') replay()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, select, replay])

  const design = DESIGNS[current]
  const Design = design.Component

  return (
    <div className="harness">
      {DESIGNS.length > 1 ? <Picker current={current} onSelect={select} onReplay={replay} /> : null}
      <Device solo={DESIGNS.length === 1} tone={design.statusBar} background={design.background}>
        <MotionConfig reducedMotion="user">
          <Suspense fallback={null}>
            <Design key={`${current}-${mountKey}`} />
          </Suspense>
        </MotionConfig>
      </Device>
    </div>
  )
}

function Picker({ current, onSelect, onReplay }: { current: number; onSelect: (i: number) => void; onReplay: () => void }) {
  const nav = useRef<HTMLElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const highlight = useRef<HTMLSpanElement>(null)
  const [ready, setReady] = useState(false)

  const move = useCallback(() => {
    const el = items.current[current]
    if (!el || !highlight.current) return
    highlight.current.style.width = `${el.offsetWidth}px`
    highlight.current.style.transform = `translateX(${el.offsetLeft}px)`
  }, [current])

  useLayoutEffect(move, [move])
  useEffect(() => {
    window.addEventListener('resize', move)
    return () => window.removeEventListener('resize', move)
  }, [move])
  useEffect(() => {
    // Enable the slide only after first paint, so load doesn't animate.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <nav ref={nav} className="proto-picker" aria-label="Prototype variants" data-position="top" data-ready={ready ? '' : undefined}>
      <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
      {DESIGNS.map((d, i) => (
        <button
          key={d.id}
          ref={(el) => {
            items.current[i] = el
          }}
          className="proto-picker-item"
          data-active={i === current ? '' : undefined}
          aria-current={i === current ? 'true' : undefined}
          onClick={() => onSelect(i)}
        >
          {d.name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={onReplay}>
        ↻
      </button>
    </nav>
  )
}

function useIsPhone() {
  const query = '(max-width: 519px)'
  const [phone, setPhone] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setPhone(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}

function useFitScale(solo: boolean) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () =>
      setScale(Math.min(1, (innerHeight - (solo ? 48 : 104)) / OUTER.h, (innerWidth - 32) / OUTER.w))
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [solo])
  return scale
}

function Device({
  children,
  tone,
  background,
  solo,
}: {
  children: React.ReactNode
  tone: 'light' | 'dark'
  background: string
  /** Only one design: no picker, so no band reserved for it. */
  solo: boolean
}) {
  const phone = useIsPhone()
  const scale = useFitScale(solo)
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)

  const style = phone
    ? ({
        // With the picker band above, the device starts below the status bar; alone, it sits under it.
        ['--sat' as string]: solo ? 'max(12px, env(safe-area-inset-top, 0px))' : '12px',
        ['--sab' as string]: 'env(safe-area-inset-bottom, 0px)',
        background,
      } as React.CSSProperties)
    : ({
        ['--sat' as string]: '47px',
        ['--sab' as string]: '26px',
        width: DEVICE.w,
        height: DEVICE.h,
        background,
        // Keeps position: fixed children inside the screen.
        transform: 'translateZ(0)',
      } as React.CSSProperties)

  const screen = (
    <div ref={setFrame} className={phone ? 'device device-phone' : 'device device-desktop device-screen'} style={style}>
      <FrameContext.Provider value={frame}>{frame ? children : null}</FrameContext.Provider>
      {!phone && <StatusBar tone={tone} />}
      {!phone && <span aria-hidden className={`home-indicator ${tone === 'light' ? 'bg-white' : 'bg-black'}`} />}
      <canvas ref={registerConfettiCanvas} aria-hidden className="confetti-canvas" />
    </div>
  )

  return (
    <div className={`${phone ? 'stage stage-phone' : 'stage stage-desktop'}${solo ? ' stage-solo' : ''}`}>
      {phone ? (
        // On a real phone the phone is the frame.
        screen
      ) : (
        // devices.css's iPhone 14 in Midnight: frame, notch, sensors, buttons (iphone-14.css).
        <div className="device-iphone-14 iphone" style={{ transform: `scale(${scale})` }}>
          <div className="device-frame">{screen}</div>
          <div aria-hidden className="device-stripe" />
          <div aria-hidden className="device-header" />
          <div aria-hidden className="device-sensors" />
          <div aria-hidden className="device-btns" />
          <SideButton />
          <div aria-hidden className="device-home" />
        </div>
      )}
    </div>
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

function StatusBar({ tone }: { tone: 'light' | 'dark' }) {
  const color = tone === 'light' ? '#fff' : '#000'
  return (
    <div aria-hidden className="status-bar" style={{ color }}>
      <span className="status-time">9:41</span>
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
