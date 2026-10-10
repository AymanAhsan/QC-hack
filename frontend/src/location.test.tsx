import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'
import { LocationProvider, useStoreDetection } from './location'
import { fix, geolocationError, mockGeolocation, resetGeolocation, setSecureContext } from './test/geolocation'
import { traderJoes } from './test/fixtures'
import type { DetectLocationResponse } from './types'

function Probe() {
  const d = useStoreDetection()
  return (
    <div>
      <span data-testid="status">{d.status}</span>
      <span data-testid="store">{d.location?.id ?? 'none'}</span>
      <span data-testid="id">{d.id}</span>
      <button type="button" onClick={d.recheck}>
        recheck
      </button>
    </div>
  )
}

function renderProbe(strict = false) {
  const tree = (
    <LocationProvider>
      <Probe />
    </LocationProvider>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

const matched: DetectLocationResponse = { status: 'matched', location: traderJoes, is_demo_data: true }

describe('startup store detection', () => {
  beforeEach(() => setSecureContext(true))
  afterEach(() => resetGeolocation())

  it('sends the fix to the backend and reports the matched store', async () => {
    mockGeolocation((ok) => ok(fix(40.73342, -73.98788, 12)))
    const detect = vi.spyOn(api, 'detectLocation').mockResolvedValue(matched)

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('detected'))
    expect(screen.getByTestId('store').textContent).toBe('trader-joes')
    expect(detect).toHaveBeenCalledWith({ lat: 40.73342, lng: -73.98788, accuracy_m: 12 }, expect.any(AbortSignal))
  })

  it('counts one detection even when StrictMode runs the effect twice', async () => {
    mockGeolocation((ok) => ok(fix(40.73342, -73.98788)))
    vi.spyOn(api, 'detectLocation').mockResolvedValue(matched)

    renderProbe(true)

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('detected'))
    expect(screen.getByTestId('id').textContent).toBe('1')
  })

  it.each([
    ['no_match', 'no_store'],
    ['low_accuracy', 'low_accuracy'],
  ] as const)('maps a %s response to %s', async (apiStatus, expected) => {
    mockGeolocation((ok) => ok(fix(0, 0)))
    vi.spyOn(api, 'detectLocation').mockResolvedValue({ status: apiStatus, location: null, is_demo_data: true })

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe(expected))
    expect(screen.getByTestId('store').textContent).toBe('none')
  })

  it('reports denied permission without calling the backend', async () => {
    mockGeolocation((_ok, fail) => fail(geolocationError(1)))
    const detect = vi.spyOn(api, 'detectLocation')

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('denied'))
    expect(detect).not.toHaveBeenCalled()
  })

  it.each([2, 3] as const)('treats position error %i as unavailable', async (code) => {
    mockGeolocation((_ok, fail) => fail(geolocationError(code)))
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unavailable'))
  })

  it('explains an insecure context instead of asking the browser', () => {
    setSecureContext(false)
    const get = mockGeolocation(() => {})

    renderProbe()

    expect(screen.getByTestId('status').textContent).toBe('insecure')
    expect(get).not.toHaveBeenCalled()
  })

  it('uses ?geo= instead of the browser, even on an insecure origin', async () => {
    setSecureContext(false)
    const get = mockGeolocation(() => {})
    const detect = vi.spyOn(api, 'detectLocation').mockResolvedValue(matched)
    window.history.pushState({}, '', '/?geo=40.73342,-73.98788,25')

    try {
      renderProbe()
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('detected'))
      expect(detect).toHaveBeenCalledWith({ lat: 40.73342, lng: -73.98788, accuracy_m: 25 }, expect.any(AbortSignal))
      expect(get).not.toHaveBeenCalled()
    } finally {
      window.history.pushState({}, '', '/')
    }
  })

  it('ignores a malformed ?geo= value', () => {
    window.history.pushState({}, '', '/?geo=north,pole')
    try {
      mockGeolocation(() => {})
      renderProbe()
      expect(screen.getByTestId('status').textContent).toBe('locating')
    } finally {
      window.history.pushState({}, '', '/')
    }
  })

  it('is unavailable when the browser has no geolocation', () => {
    renderProbe()
    expect(screen.getByTestId('status').textContent).toBe('unavailable')
  })

  it('reports an error when the backend fails', async () => {
    mockGeolocation((ok) => ok(fix(40.7, -73.9)))
    vi.spyOn(api, 'detectLocation').mockRejectedValue(new ApiError(0, 'network_error', 'down'))

    renderProbe()

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('error'))
  })

  it('rechecks on demand with a fresh fix and bumps the detection id', async () => {
    const get = mockGeolocation((ok) => ok(fix(40.73342, -73.98788)))
    vi.spyOn(api, 'detectLocation').mockResolvedValue(matched)

    renderProbe()
    await waitFor(() => expect(screen.getByTestId('id').textContent).toBe('1'))
    expect(get.mock.calls[0][2]?.maximumAge).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'recheck' }))

    await waitFor(() => expect(screen.getByTestId('id').textContent).toBe('2'))
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[1][2]?.maximumAge).toBe(0)
  })
})
