import { useEffect, useState } from 'react'
import { api } from '../api'
import type { HealthResponse } from '../types'

/** Development-only badge showing backend reachability, database mode, and Gemini status. */
export function DevStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [down, setDown] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    api
      .health(ctrl.signal)
      .then((h) => (setHealth(h), setDown(false)))
      .catch(() => !ctrl.signal.aborted && setDown(true))
    return () => ctrl.abort()
  }, [])

  if (!import.meta.env.DEV) return null
  const text = down ? 'API offline' : health ? `DB: ${health.db_mode} · Gemini: ${health.gemini_configured ? 'on' : 'off'}` : 'API…'
  return (
    <div className="pointer-events-none fixed right-2 top-[calc(env(safe-area-inset-top)+4px)] z-50 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/60 backdrop-blur">
      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${down ? 'bg-red-500' : health ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {text}
    </div>
  )
}
