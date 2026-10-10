import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocationProvider } from '../../location'
import { NavProvider } from '../../navigation'
import { WalletScreen } from './WalletScreen'
// Real responses captured from the backend (GET /api/wallet, /api/locations, /api/recommend).
import wallet from './__fixtures__/wallet.json'
import locations from './__fixtures__/locations.json'
import recTraderJoes from './__fixtures__/recommend-trader-joes.json'
import recTraderJoes100 from './__fixtures__/recommend-trader-joes-100.json'

const createTransaction = vi.fn()
const recommend = vi.fn()
const cardBenefits = vi.fn()

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>()
  return {
    ...actual,
    newIdempotencyKey: () => 'test-idempotency-key',
    api: {
      ...actual.api,
      wallet: async () => wallet,
      locations: async () => locations,
      recommend: (...args: unknown[]) => recommend(...args),
      createTransaction: (...args: unknown[]) => createTransaction(...args),
      cardBenefits: (...args: unknown[]) => cardBenefits(...args),
    },
  }
})

async function arriveAtTraderJoes() {
  const view = render(
    <NavProvider>
      <LocationProvider>
        <WalletScreen />
      </LocationProvider>
    </NavProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: /Simulate arriving at a store/ }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Choose a store' })).getByRole('button', { name: /Trader Joe/ }))
  const pay = screen.getByRole('button', { name: 'Hold near terminal to pay' })
  await vi.waitFor(() => expect((pay as HTMLButtonElement).disabled).toBe(false))
  return Object.assign(pay, { unmount: view.unmount })
}

/** Arrive with real timers (Testing Library polls with setTimeout), then fake the hold timers. */
async function arriveThenFakeTimers() {
  const pay = await arriveAtTraderJoes()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  return pay
}

const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms))

beforeEach(() => {
  recommend.mockImplementation(async (_id: string, amount?: number) => (amount === 10000 ? recTraderJoes100 : recTraderJoes))
  createTransaction.mockResolvedValue({
    duplicate: false,
    transaction: { points_earned: 170, earned_cents: 306 },
  })
})

afterEach(() => {
  vi.useRealTimers()
  createTransaction.mockReset()
  recommend.mockReset()
})

describe('Wallet hold-to-pay', () => {
  it('reads at 600 ms, succeeds at 1,000 ms, and logs exactly one transaction', async () => {
    const pay = await arriveThenFakeTimers()
    fireEvent.pointerDown(pay, { pointerId: 1 })
    expect(screen.getByText('Searching for terminal…')).toBeTruthy()

    await advance(599)
    expect(screen.queryByText('Reading Card…')).toBeNull()
    await advance(1)
    expect(screen.getByText('Reading Card…')).toBeTruthy()

    await advance(399)
    expect(createTransaction).not.toHaveBeenCalled()
    await advance(1)
    expect(screen.getByText('Approved')).toBeTruthy()
    expect(createTransaction).toHaveBeenCalledTimes(1)
    expect(createTransaction.mock.calls[0][0]).toEqual({
      idempotency_key: 'test-idempotency-key',
      merchant_id: 'trader-joes',
      subtotal_cents: 4250,
      card_used_id: 'amex-gold',
      channel: 'store',
      source: 'wallet',
    })

    // Releasing after success and letting the receipt appear never logs again.
    fireEvent.pointerUp(pay, { pointerId: 1 })
    await advance(5000)
    expect(createTransaction).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toContain('Approved')
  })

  it('cancels when released before success', async () => {
    const pay = await arriveThenFakeTimers()
    fireEvent.pointerDown(pay, { pointerId: 1 })
    await advance(800)
    fireEvent.pointerUp(pay, { pointerId: 1 })
    await advance(5000)
    expect(createTransaction).not.toHaveBeenCalled()
    expect(screen.getByText('(( Hold Near Terminal ))')).toBeTruthy()
  })

  it('cancels on pointer cancel and clears timers on unmount', async () => {
    const pay = await arriveThenFakeTimers()
    fireEvent.pointerDown(pay, { pointerId: 1 })
    fireEvent.pointerCancel(pay, { pointerId: 1 })
    await advance(5000)
    expect(createTransaction).not.toHaveBeenCalled()

    // Leaving the tab mid-hold unmounts the screen; its timers must not fire later.
    fireEvent.pointerDown(pay, { pointerId: 1 })
    await advance(700)
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    pay.unmount()
    expect(vi.getTimerCount()).toBe(0)
    await advance(5000)
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('re-ranks for a typed purchase amount', async () => {
    await arriveAtTraderJoes()
    const amount = screen.getByRole('textbox', { name: /Purchase amount/ })
    expect((amount as HTMLInputElement).value).toBe('42.50')
    fireEvent.change(amount, { target: { value: '100' } })
    fireEvent.blur(amount)
    await vi.waitFor(() => expect(recommend).toHaveBeenLastCalledWith('trader-joes', 10000, expect.anything()))
    await vi.waitFor(() => expect((screen.getByRole('textbox', { name: /Purchase amount/ }) as HTMLInputElement).value).toBe('100.00'))
  })

  it('restores the amount when the input is invalid', async () => {
    await arriveAtTraderJoes()
    const amount = screen.getByRole('textbox', { name: /Purchase amount/ })
    fireEvent.change(amount, { target: { value: 'abc' } })
    fireEvent.blur(amount)
    expect((amount as HTMLInputElement).value).toBe('42.50')
    expect(recommend).toHaveBeenCalledTimes(1)
  })

  it("opens a card's benefits on tap, but not mid-payment", async () => {
    cardBenefits.mockReturnValue(new Promise(() => {}))
    const pay = await arriveAtTraderJoes()
    fireEvent.click(screen.getByRole('button', { name: 'Chase Freedom benefits' }))
    expect(screen.getByRole('dialog', { name: 'Chase Freedom benefits' })).toBeTruthy()
    expect(cardBenefits).toHaveBeenCalledWith('chase-freedom', expect.anything())
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chase Freedom benefits' })).toBeNull())

    fireEvent.pointerDown(pay, { pointerId: 1 })
    expect((screen.getByRole('button', { name: 'Amex Gold benefits' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.pointerUp(pay, { pointerId: 1 })
  })
})
