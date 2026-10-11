import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api'
import { LocationProvider } from '../../location'
import { NavProvider } from '../../navigation'
import { fix, geolocationError, mockGeolocation, resetGeolocation, setSecureContext } from '../../test/geolocation'
import { amexGold, chaseFreedom, costco, recommendationFor, traderJoes } from '../../test/fixtures'
import type { DetectLocationResponse } from '../../types'
import { WalletScreen } from './WalletScreen'

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderWallet() {
  return render(
    <NavProvider>
      <LocationProvider>
        <WalletScreen />
      </LocationProvider>
    </NavProvider>,
  )
}

const matched: DetectLocationResponse = { status: 'matched', location: traderJoes, is_demo_data: true }

function stubApi() {
  vi.spyOn(api, 'wallet').mockResolvedValue({ cards: [amexGold, chaseFreedom], default_debit_card_id: null, is_demo_data: true })
  vi.spyOn(api, 'locations').mockResolvedValue({ locations: [traderJoes, costco], is_demo_data: true })
  return vi.spyOn(api, 'recommend').mockImplementation(async (merchantId) =>
    merchantId === 'costco' ? recommendationFor(costco, chaseFreedom) : recommendationFor(traderJoes, amexGold),
  )
}

describe('Wallet store detection', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    setSecureContext(true)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    resetGeolocation()
  })

  it('shows the best card for the detected store without any tap', async () => {
    mockGeolocation((ok) => ok(fix(40.73342, -73.98788, 10)))
    vi.spyOn(api, 'detectLocation').mockResolvedValue(matched)
    const recommend = stubApi()

    renderWallet()

    await screen.findByText("Trader Joe's (Grocery)")
    expect(recommend).toHaveBeenCalledOnce()
    expect(recommend.mock.calls[0][0]).toBe('trader-joes')
    expect(screen.getByText('Detected from your location · 18 m away')).toBeTruthy()
    // The winning card carries the yield badge from the recommendation.
    expect(screen.getByText('4x · 7.2% yield')).toBeTruthy()
  })

  it('does not re-arrive after the user leaves the store', async () => {
    mockGeolocation((ok) => ok(fix(40.73342, -73.98788)))
    vi.spyOn(api, 'detectLocation').mockResolvedValue(matched)
    const recommend = stubApi()

    renderWallet()
    await screen.findByText("Trader Joe's (Grocery)")

    fireEvent.click(screen.getByRole('button', { name: 'Leave store' }))

    await screen.findByText('Simulate arriving at a store')
    expect(screen.getByText("You're near Trader Joe's.")).toBeTruthy()
    expect(recommend).toHaveBeenCalledOnce()

    // "Check again" is the way back: a new detection arrives at the store again.
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }))
    await screen.findByText("Trader Joe's (Grocery)")
    expect(recommend).toHaveBeenCalledTimes(2)
  })

  it('never overrides a store the user picked before detection finished', async () => {
    mockGeolocation((ok) => ok(fix(40.73342, -73.98788)))
    let finishDetection!: (r: DetectLocationResponse) => void
    vi.spyOn(api, 'detectLocation').mockReturnValue(new Promise((resolve) => (finishDetection = resolve)))
    const recommend = stubApi()

    renderWallet()
    await screen.findByText('Finding the store you\'re in…')

    fireEvent.click(screen.getByRole('button', { name: /Simulate arriving at a store/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Costco/ }))
    await screen.findByText('Costco (Wholesale club)')

    finishDetection(matched)
    await act(async () => {}) // let the detection promise settle

    expect(screen.getByText('Costco (Wholesale club)')).toBeTruthy()
    expect(recommend.mock.calls.map((c) => c[0])).toEqual(['costco'])

    // Leaving the store must not snap to the detected one either.
    fireEvent.click(screen.getByRole('button', { name: 'Leave store' }))
    await screen.findByText("You're near Trader Joe's.")
    expect(recommend.mock.calls.map((c) => c[0])).toEqual(['costco'])
  })

  it.each([
    [() => mockGeolocation((_ok, fail) => fail(geolocationError(1))), /Location access is off/],
    [() => setSecureContext(false), /HTTPS or localhost/],
  ] as const)('falls back to the manual picker when location is unavailable', async (arrange, message) => {
    arrange()
    vi.spyOn(api, 'detectLocation')
    const recommend = stubApi()

    renderWallet()

    await screen.findByText(message)
    expect(recommend).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Simulate arriving at a store/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Trader Joe's/ }))
    await screen.findByText("Trader Joe's (Grocery)")
    expect(recommend).toHaveBeenCalledWith('trader-joes', undefined, expect.any(AbortSignal))
    // A manual pick is never labelled as detected.
    expect(screen.queryByText(/Detected from your location/)).toBeNull()
  })

  it('says so when no demo store is nearby', async () => {
    mockGeolocation((ok) => ok(fix(51.5, -0.12)))
    vi.spyOn(api, 'detectLocation').mockResolvedValue({ status: 'no_match', location: null, is_demo_data: true })
    stubApi()

    renderWallet()

    await screen.findByText(/No demo store is near you/)
  })
})
