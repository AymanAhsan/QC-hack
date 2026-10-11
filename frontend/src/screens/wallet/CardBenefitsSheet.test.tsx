import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../api'
import type { Card, CardBenefitsResponse } from '../../types'
import { CardBenefitsSheet } from './CardBenefitsSheet'
// Real response captured from GET /api/wallet/amex-gold/benefits.
import benefits from './__fixtures__/benefits-amex-gold.json'

// JSON imports type strings loosely; the fixture is a real API response.
const data = benefits as unknown as CardBenefitsResponse
const amex = data.card as Card

afterEach(() => vi.restoreAllMocks())

describe('CardBenefitsSheet', () => {
  it('lists rates, where the card wins, and where it is declined', async () => {
    const load = vi.spyOn(api, 'cardBenefits').mockResolvedValue(data)
    render(<CardBenefitsSheet card={amex} onClose={() => {}} />)

    const dialog = await screen.findByRole('dialog', { name: 'Amex Gold benefits' })
    await within(dialog).findByText('Points worth 1.8¢ each')
    expect(load).toHaveBeenCalledWith('amex-gold', expect.anything())

    // Rewards rows, highest yield first, base rate last.
    const rows = within(dialog).getAllByRole('listitem').filter((li) => li.textContent?.includes('value'))
    const labels = rows.map((r) => r.querySelector('.font-medium')?.firstChild?.textContent)
    expect(labels).toEqual(['Dining', 'Grocery', 'Airfare', 'Everything else'])
    expect(within(rows[1]).getByText("Trader Joe's, Whole Foods")).toBeTruthy()
    expect(within(rows[1]).getByText('7.2% value')).toBeTruthy()
    expect(within(rows[3]).getByText('All other purchases')).toBeTruthy()
    expect(within(dialog).getAllByText('Top rate')).toHaveLength(2)

    // Wins and rejections come straight from the engine.
    expect(within(dialog).getByText("Trader Joe's", { selector: 'li' })).toBeTruthy()
    expect(within(dialog).getByText('Amex not accepted at Costco')).toBeTruthy()
    expect(within(dialog).getByText('Terminals take Visa only')).toBeTruthy()
  })

  it('closes on Done and on Escape', async () => {
    vi.spyOn(api, 'cardBenefits').mockResolvedValue(data)
    const onClose = vi.fn()
    render(<CardBenefitsSheet card={amex} onClose={onClose} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Done' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('shows an error with retry', async () => {
    const load = vi
      .spyOn(api, 'cardBenefits')
      .mockRejectedValueOnce(new ApiError(503, 'database_unavailable', 'The database is unavailable.'))
      .mockResolvedValue(data)
    render(<CardBenefitsSheet card={amex} onClose={() => {}} />)
    expect((await screen.findByRole('alert')).textContent).toContain('The database is unavailable.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('Points worth 1.8¢ each')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('renders nothing without a card', () => {
    render(<CardBenefitsSheet card={null} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
