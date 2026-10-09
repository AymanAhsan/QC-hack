import { useState, type FormEvent } from 'react'
import { activeUserId, api } from '../../api'
import type { Card, CardType } from '../../types'
import { ErrorNotice } from '../../components/ui'
import { WalletCard } from './WalletCard'

export const CARD_TYPES: { type: CardType; name: string }[] = [
  { type: 'amex-gold', name: 'Amex Gold' },
  { type: 'chase-sapphire', name: 'Chase Sapphire' },
  { type: 'chase-freedom', name: 'Chase Freedom' },
  { type: 'venture-x', name: 'Venture X' },
  { type: 'apple-card', name: 'Apple Card' },
  { type: 'everyday-debit', name: 'Everyday Debit' },
]

interface Props {
  cards: Card[]
  onChange: () => Promise<void>
  onClose: () => void
}

export function CardManager({ cards, onChange, onClose }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [type, setType] = useState<CardType>('amex-gold')
  const [last4, setLast4] = useState('')
  const [userId, setUserId] = useState(activeUserId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const inputClass = 'min-w-0 w-full rounded-xl border border-white/20 bg-black p-3 text-white'

  const reset = () => {
    setEditing(null)
    setType('amex-gold')
    setLast4('')
  }

  const mutate = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChange()
      reset()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void mutate(() => editing
      ? api.updateCard(activeUserId(), editing, { type, last4 })
      : api.createCard(activeUserId(), { type, last4 }))
  }

  return (
    <div className="mb-5 rounded-2xl border border-white/15 bg-white/5 p-4" aria-label="Manage cards">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Manage cards</h2>
        <button type="button" disabled={busy} onClick={onClose} className="text-sm text-sky-300">Done</button>
      </div>
      <form onSubmit={(event) => {
        event.preventDefault()
        localStorage.setItem('wallet-user-id', userId)
        window.location.reload()
      }} className="mb-5 space-y-2">
        <label htmlFor="wallet-user" className="block text-sm text-white/70">Demo user ID</label>
        <div className="flex gap-2">
          <input id="wallet-user" value={userId} onChange={(e) => setUserId(e.target.value)} required pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}" maxLength={64} className={inputClass} disabled={busy} />
          <button type="submit" disabled={busy} className="shrink-0 rounded-xl bg-white/10 px-3 text-sm">Switch user</button>
        </div>
      </form>
      {error ? <ErrorNotice error={error} /> : null}
      <form onSubmit={submit} className="space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-2 text-sm font-semibold">{editing ? 'Edit card' : 'Add a card'}</legend>
          <label htmlFor="card-type" className="block text-sm text-white/70">Card type</label>
          <select id="card-type" value={type} onChange={(e) => setType(e.target.value as CardType)} className={inputClass}>
            {CARD_TYPES.map((choice) => <option key={choice.type} value={choice.type}>{choice.name}</option>)}
          </select>
          <label htmlFor="card-last4" className="block text-sm text-white/70">Last four digits</label>
          <input id="card-last4" value={last4} onChange={(e) => setLast4(e.target.value)} inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} required placeholder="0042" className={inputClass} />
          <div className="flex gap-3">
            <button type="submit" className="rounded-xl bg-sky-400 px-4 py-2 font-semibold text-black disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save card' : 'Add card'}</button>
            {editing && <button type="button" onClick={reset} className="text-sm text-white/70">Cancel edit</button>}
          </div>
        </fieldset>
      </form>
      <ul className="mt-5 space-y-4">
        {cards.map((card) => (
          <li key={card.id}>
            <div className="overflow-hidden rounded-2xl">
              <WalletCard card={card} width={260} height={164} />
            </div>
            <div className="mt-2 flex gap-4">
              <button type="button" disabled={busy} aria-label={`Edit ${card.name} ending in ${card.last4}`} onClick={() => {
                setEditing(card.id)
                setType(card.type)
                setLast4(card.last4)
              }} className="text-sm text-sky-300 disabled:opacity-50">Edit</button>
              <button type="button" disabled={busy} aria-label={`Delete ${card.name} ending in ${card.last4}`} onClick={() => void mutate(() => api.deleteCard(activeUserId(), card.id))} className="text-sm text-red-300 disabled:opacity-50">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
