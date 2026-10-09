import type { Card } from '../../types'

/** A tiny card face in the card's brand gradient; neutral until the wallet has loaded. */
export function CardSwatch({ card }: { card: Card | undefined }) {
  const [from, to] = card?.gradient ?? ['#3a3a3c', '#1c1c1e']
  return (
    <span
      aria-hidden="true"
      className="inline-block h-6 w-9 shrink-0 rounded-[5px] ring-1 ring-white/15"
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    />
  )
}
