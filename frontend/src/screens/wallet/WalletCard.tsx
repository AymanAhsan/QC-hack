// Apple Wallet-style card face: brand gradient, metallic sheen, EMV chip,
// masked number. The name and network sit in the top strip because that strip
// is all that shows while the card is stacked.

import { motion } from 'motion/react'
import type { Card, CardEvaluation } from '../../types'
import { formatPct } from '../../lib/format'

const NETWORK_MARK: Record<Card['network'], string> = { visa: 'VISA', mastercard: 'MC', amex: 'AMEX' }
const NETWORK_NAME: Record<Card['network'], string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' }

interface Props {
  card: Card
  width: number
  height: number
  evaluation?: CardEvaluation
  isWinner?: boolean
}

export function WalletCard({ card, width, height, evaluation, isWinner = false }: Props) {
  const rejected = evaluation ? !evaluation.accepted : false
  const [from, to] = card.gradient

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 pb-5 pt-4 select-none transition-shadow duration-500"
      style={{
        width,
        height,
        color: card.text_color,
        backgroundImage: `url("${card.image}"), linear-gradient(135deg, ${from}, ${to})`,
        backgroundSize: 'cover',
        boxShadow: isWinner
          ? `0 0 32px ${card.glow}99, 0 0 0 1px ${card.glow}66, 0 10px 32px rgba(0,0,0,0.5)`
          : '0 6px 20px rgba(0,0,0,0.45)',
      }}
    >
      {/* Metallic sheen and hairline border */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.1) 100%)' }}
      />
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 rounded-2xl border ${rejected ? 'border-red-500/40' : 'border-white/15'}`} />

      {/* Top strip */}
      <div className="relative flex h-7 items-center justify-between gap-2">
        <span className="truncate text-lg font-bold tracking-wide [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">{card.name}</span>
        {rejected ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="shrink-0 rounded-lg border border-red-400/60 bg-red-500/90 px-2.5 py-0.5 text-xs font-bold text-white"
          >
            ✖ {NETWORK_NAME[card.network]} rejected
          </motion.span>
        ) : (
          <span className="shrink-0 text-sm font-extrabold italic tracking-wider opacity-80">{NETWORK_MARK[card.network]}</span>
        )}
      </div>

      {/* EMV chip */}
      <div
        aria-hidden="true"
        className="relative mt-[8%] h-8 w-[42px] rounded-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.3)]"
        style={{ background: 'linear-gradient(145deg, #e8d5a3 0%, #c4a54d 30%, #d4b96a 60%, #c4a54d 100%)' }}
      >
        <span className="absolute inset-x-1 top-1/2 h-px bg-black/15" />
        <span className="absolute inset-y-1 left-1/2 w-px bg-black/15" />
      </div>

      {/* Masked number */}
      <div className="absolute bottom-5 left-5 font-mono text-base tracking-[0.15em] opacity-85" aria-label={`Card ending in ${card.last4}`}>•••• {card.last4}</div>

      {/* Yield badge on the winner */}
      {isWinner && evaluation?.accepted && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
          className="absolute bottom-12 right-5 rounded-full border border-emerald-400/30 bg-black/55 px-3 py-1 text-sm font-bold text-emerald-400 backdrop-blur"
        >
          {card.reward_type === 'points' ? `${evaluation.multiplier}x · ${formatPct(evaluation.yield_pct)} yield` : `${formatPct(evaluation.yield_pct)} cash back`}
        </motion.span>
      )}
    </div>
  )
}
