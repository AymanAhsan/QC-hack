// Store detection: where is the device, and which demo store is that?
//
// Runs once when the app starts and again on recheck(). The provider sits above
// the screens, so the result survives tab switches (screens unmount).
//
//   const detection = useStoreDetection()
//   detection.status     // see DetectionStatus
//   detection.location   // the matched Location when status is 'detected'; distance_m is measured
//   detection.id         // bumps on every new match; act on each id once
//   detection.recheck()  // ask again, e.g. after the user allows location
//
// Coordinates go to POST /api/locations/detect and are not kept anywhere.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { Location } from './types'

export type DetectionStatus =
  | 'locating' // waiting for the browser's position fix
  | 'matching' // have a fix, asking the backend which store it is
  | 'detected' // inside a demo store
  | 'no_store' // good fix, no demo store nearby
  | 'low_accuracy' // fix too coarse to say which store
  | 'denied' // the user refused location access
  | 'insecure' // browsers only share location over HTTPS or localhost
  | 'unavailable' // no geolocation API, or no fix (timeout, no signal)
  | 'error' // the backend could not be reached

interface State {
  status: DetectionStatus
  location: Location | null
  id: number
}

export interface StoreDetection extends State {
  recheck: () => void
}

const FIX_TIMEOUT_MS = 10_000
const STARTUP_MAX_FIX_AGE_MS = 60_000

/** Demo override: `?geo=lat,lng[,accuracy_m]` stands in for the device's fix (works over plain http on a phone). */
function geoOverride(): { latitude: number; longitude: number; accuracy: number } | null {
  const raw = new URLSearchParams(window.location.search).get('geo')
  if (!raw) return null
  const [lat, lng, acc] = raw.split(',').map((part) => Number(part.trim()))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { latitude: lat, longitude: lng, accuracy: Number.isFinite(acc) && acc >= 0 ? acc : 10 }
}

/** Why the browser cannot be asked at all, if it cannot. */
function unsupported(): DetectionStatus | null {
  if (geoOverride()) return null
  if (!window.isSecureContext) return 'insecure'
  if (!('geolocation' in navigator)) return 'unavailable'
  return null
}

const LocationContext = createContext<StoreDetection | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({ status: unsupported() ?? 'locating', location: null, id: 0 }))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (unsupported()) return
    const ctrl = new AbortController()
    const settle = (status: DetectionStatus, location: Location | null = null) => {
      if (ctrl.signal.aborted) return
      setState((s) => ({ status, location, id: location ? s.id + 1 : s.id }))
    }

    const match = (coords: { latitude: number; longitude: number; accuracy: number }) => {
      if (ctrl.signal.aborted) return
      setState((s) => ({ ...s, status: 'matching' }))
      api.detectLocation({ lat: coords.latitude, lng: coords.longitude, accuracy_m: coords.accuracy }, ctrl.signal).then(
        (res) => {
          if (res.status === 'matched' && res.location) settle('detected', res.location)
          else settle(res.status === 'low_accuracy' ? 'low_accuracy' : 'no_store')
        },
        () => settle('error'),
      )
    }

    const override = geoOverride()
    if (override) {
      match(override)
      return () => ctrl.abort()
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => match(coords),
      (err) => settle(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      // Startup may reuse a recent fix; a manual recheck wants where you are now.
      { enableHighAccuracy: true, timeout: FIX_TIMEOUT_MS, maximumAge: attempt === 0 ? STARTUP_MAX_FIX_AGE_MS : 0 },
    )
    return () => ctrl.abort()
  }, [attempt])

  const recheck = useCallback(() => {
    setState((s) => ({ ...s, status: unsupported() ?? 'locating', location: null }))
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo(() => ({ ...state, recheck }), [state, recheck])
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useStoreDetection(): StoreDetection {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useStoreDetection must be used inside <LocationProvider>')
  return ctx
}
