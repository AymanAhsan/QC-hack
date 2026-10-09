import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MissedResponse, Transaction } from '../../types'
import { MissedView } from './MissedScreen'

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'purchase',
  ts: '2026-10-09T14:00:00Z',
  merchant_id: 'trader-joes',
  merchant_name: "Trader Joe's",
  category: 'grocery',
  channel: 'store',
  source: 'wallet',
  subtotal_cents: 4250,
  shipping_cents: null,
  coupon_code: null,
  coupon_savings_cents: 0,
  amount_cents: 4250,
  card_used_id: 'everyday-debit',
  best_card_id: 'amex-gold',
  earned_cents: 0,
  best_possible_cents: 306,
  missed_cents: 306,
  points_earned: null,
  is_simulated: true,
  ...overrides,
})

// Test data only. Real screen data comes from GET /api/missed.
const sample: MissedResponse = {
  window_days: 30,
  window_label: 'Last 30 days',
  total_missed_cents: 4250,
  total_earned_cents: 1820,
  total_best_possible_cents: 6070,
  transaction_count: 30,
  daily: Array.from({ length: 31 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 8, 9 + i)).toISOString().slice(0, 10),
    missed_cents: i < 25 ? 170 : 0,
    earned_cents: 0,
    count: i < 30 ? 1 : 0,
  })),
  by_category: [
    { category: 'grocery', category_label: 'Grocery', missed_cents: 2650 },
    { category: 'apparel', category_label: 'Apparel', missed_cents: 1100 },
  ],
  recent: [
    tx({ id: 'purchase-1' }),
    tx({ id: 'purchase-2', merchant_name: 'Costco', card_used_id: 'chase-freedom', best_card_id: 'chase-freedom', earned_cents: 500, best_possible_cents: 500, missed_cents: 0 }),
    tx({ id: 'purchase-3', merchant_name: 'Nike', channel: 'online', coupon_code: 'SAVE15', amount_cents: 8500, best_card_id: 'apple-card', best_possible_cents: 255, missed_cents: 255 }),
  ],
  db_mode: 'sqlite',
  is_demo_data: true,
}

const names = { 'everyday-debit': 'Everyday Debit', 'amex-gold': 'Amex Gold', 'chase-freedom': 'Chase Freedom', 'apple-card': 'Apple Card' }

describe('Missed', () => {
  it('shows the total, used/best choices, and the zero-loss purchase', async () => {
    render(<MissedView loadMissed={async () => sample} cardNames={names} />)
    expect(await screen.findByLabelText('$42.50')).toBeTruthy()
    expect(screen.getByText('$3.06 missed')).toBeTruthy()
    expect(screen.getAllByText('Amex Gold').length).toBeGreaterThan(0)
    expect(screen.getByText('Maximized')).toBeTruthy()
    expect(screen.getByText('Earned $0.00 of $2.55 possible')).toBeTruthy()
    expect(screen.getByText(/over the last 30 days/)).toBeTruthy()
  })

  it('shows loading before history arrives', async () => {
    let resolve: (value: MissedResponse) => void = () => {}
    const pending = new Promise<MissedResponse>((done) => {
      resolve = done
    })
    render(<MissedView loadMissed={() => pending} />)
    expect(screen.getByRole('status').textContent).toContain('Loading')
    await act(async () => resolve(sample))
    expect(screen.queryByText('Loading your simulated purchases…')).toBeNull()
  })

  it('retries a failed load', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(sample)
    render(<MissedView loadMissed={load} />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('$42.50')).toBeTruthy()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('keeps existing data visible when a refresh fails', async () => {
    const load = vi.fn().mockResolvedValueOnce(sample).mockRejectedValue(new Error('offline'))
    render(<MissedView loadMissed={load} />)
    await screen.findByLabelText('$42.50')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('$42.50')).toBeTruthy()
  })

  it('explains empty history', async () => {
    const empty = { ...sample, total_missed_cents: 0, transaction_count: 0, recent: [], by_category: [] }
    render(<MissedView loadMissed={async () => empty} />)
    expect(await screen.findByText('A fresh start')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('reloads when a purchase is logged and ignores an obsolete response', async () => {
    let obsolete: (value: MissedResponse) => void = () => {}
    const pending = new Promise<MissedResponse>((resolve) => {
      obsolete = resolve
    })
    const fresh = { ...sample, total_missed_cents: 5000 }
    const load = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(fresh)
    const { rerender } = render(<MissedView loadMissed={load} refreshKey={0} />)
    rerender(<MissedView loadMissed={load} refreshKey={1} />)
    await screen.findByLabelText('$50.00')
    await act(async () => obsolete(sample))
    expect(screen.getByLabelText('$50.00')).toBeTruthy()
  })

  it('provides keyboard-accessible daily values', async () => {
    render(<MissedView loadMissed={async () => sample} />)
    await screen.findByLabelText('$42.50')
    fireEvent.click(screen.getByText('Explore daily totals'))
    fireEvent.change(screen.getByLabelText('Choose a day'), { target: { value: '2026-09-09' } })
    expect(screen.getByRole('status').textContent).toContain('$1.70 missed across 1 simulated purchases')
    expect(screen.getByRole('table')).toBeTruthy()
  })

  it('cancels pending requests on unmount', () => {
    const load = vi.fn((_signal: AbortSignal) => new Promise<MissedResponse>(() => {}))
    const { unmount } = render(<MissedView loadMissed={load} />)
    const signal = load.mock.calls[0][0] as AbortSignal
    unmount()
    expect(signal.aborted).toBe(true)
  })
})
