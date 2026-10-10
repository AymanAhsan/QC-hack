import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../api'
import type { Card } from '../../types'
import { CardManager } from './CardManager'

const card: Card = {
  id: 'saved-card', user_id: 'ayman', type: 'amex-gold', image: '/cards/amex-gold.svg',
  name: 'Amex Gold', issuer: 'American Express', network: 'amex', last4: '0042',
  reward_type: 'points', cpp: 1.8, base_rate: 1, category_rates: { grocery: 4 },
  merchant_rates: {}, gradient: ['#d4af37', '#8a6d1d'], glow: '#f5c84c',
  text_color: '#1a1405', is_default_debit: false,
}

describe('Card manager', () => {
  beforeEach(() => localStorage.setItem('wallet-user-id', 'ayman'))

  it('offers all six types and creates a card retaining leading zeroes', async () => {
    const create = vi.spyOn(api, 'createCard').mockResolvedValue(card)
    const onChange = vi.fn().mockResolvedValue(undefined)
    render(<CardManager cards={[]} onChange={onChange} onClose={() => {}} />)
    expect(screen.getAllByRole('option')).toHaveLength(6)
    fireEvent.change(screen.getByLabelText('Card type'), { target: { value: 'apple-card' } })
    fireEvent.change(screen.getByLabelText('Last four digits'), { target: { value: '0001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith('ayman', { type: 'apple-card', last4: '0001' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
    await waitFor(() => expect((screen.getByLabelText('Last four digits') as HTMLInputElement).value).toBe(''))
  })

  it('renders artwork and digits at the bottom left and deletes the instance', async () => {
    const remove = vi.spyOn(api, 'deleteCard').mockResolvedValue(undefined)
    const onChange = vi.fn().mockResolvedValue(undefined)
    render(<CardManager cards={[card]} onChange={onChange} onClose={() => {}} />)
    const suffix = screen.getByLabelText('Card ending in 0042')
    expect(suffix.className).toContain('bottom-5 left-5')
    expect(suffix.parentElement?.style.backgroundImage).toContain('/cards/amex-gold.svg')
    expect(screen.queryByRole('button', { name: /^Edit / })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Amex Gold ending in 0042' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith('ayman', 'saved-card'))
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
  })

  it('preserves the form and displays a failed save', async () => {
    vi.spyOn(api, 'createCard').mockRejectedValue(new ApiError(503, 'database_unavailable', 'Could not save card'))
    const onChange = vi.fn()
    render(<CardManager cards={[]} onChange={onChange} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Last four digits'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }))
    await screen.findByText('Could not save card')
    expect(onChange).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Last four digits') as HTMLInputElement).value).toBe('1234')
  })
})
