// Test double for navigator.geolocation (jsdom has none) and the secure-context flag.

import { vi } from 'vitest'

type Reply = (ok: PositionCallback, fail: PositionErrorCallback, options?: PositionOptions) => void

export function fix(latitude: number, longitude: number, accuracy = 10): GeolocationPosition {
  return { coords: { latitude, longitude, accuracy } } as GeolocationPosition
}

/** 1 = permission denied, 2 = position unavailable, 3 = timeout. */
export function geolocationError(code: 1 | 2 | 3): GeolocationPositionError {
  return { code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError
}

export function mockGeolocation(reply: Reply) {
  const getCurrentPosition = vi.fn(reply)
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
  return getCurrentPosition
}

export function setSecureContext(secure: boolean) {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: secure })
}

export function resetGeolocation() {
  delete (navigator as { geolocation?: unknown }).geolocation
  setSecureContext(true)
}
