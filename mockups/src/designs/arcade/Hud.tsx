import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { FireIcon } from '@phosphor-icons/react'
import type { DemoSession } from '../../shared/session'
import { A, Push, Ring } from './ui'

/**
 * The game HUD that sits on every tab: the screen's title on the left, the
 * best-card streak and the capture rate (as a level ring) on the right. Both
 * stats jump when they change, then settle.
 */
export function Hud({ session, title, left, action, onRewards }: { session: DemoSession; title?: string; left?: ReactNode; action?: ReactNode; onRewards?: () => void }) {
  const { streak, captureRate } = session.stats
  const pct = Math.round(captureRate * 100)
  // On Rewards itself the stats are read-only: same look, no dead button.
  const Pill = onRewards ? Push : StaticPill
  return (
    <header className="flex items-center gap-2 px-4 pb-3 pt-1">
      <div className="min-w-0 flex-1">{left ?? <h1 className="text-[32px] font-black leading-none tracking-[-0.6px]">{title}</h1>}</div>
      <Pill
        depth={3}
        radius={14}
        onClick={onRewards}
        aria-label={`Best-card streak: ${streak}${onRewards ? '. Open Rewards' : ''}`}
        faceClassName="h-[41px] gap-1 px-2.5 text-[17px] font-black tabular-nums"
      >
        <FireIcon size={20} weight="fill" style={{ color: streak ? A.flame : '#D9CCB6' }} />
        <motion.span key={streak} initial={{ scale: 1.5, y: -2 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', duration: 0.5, bounce: 0.5 }}>
          {streak}
        </motion.span>
      </Pill>
      <Pill
        depth={3}
        radius={14}
        onClick={onRewards}
        aria-label={`${pct}% of possible rewards captured${onRewards ? '. Open Rewards' : ''}`}
        faceClassName="h-[41px] gap-1.5 pl-2 pr-2.5 text-[15px] font-black tabular-nums"
      >
        <Ring value={captureRate} size={24} stroke={5} />
        <motion.span key={pct} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5, bounce: 0.45 }}>
          {pct}%
        </motion.span>
      </Pill>
      {action}
    </header>
  )
}

function StaticPill({ children, faceClassName = '', radius = 14, depth = 3, ...rest }: React.ComponentProps<typeof Push>) {
  return (
    <span role="img" aria-label={rest['aria-label']} className="relative block shrink-0" style={{ borderRadius: radius, paddingBottom: depth }}>
      <span aria-hidden className="absolute inset-x-0 bottom-0" style={{ top: depth, background: '#EADFCC', borderRadius: radius }} />
      <span className={`relative flex items-center justify-center bg-white ${faceClassName}`} style={{ borderRadius: radius }}>
        {children}
      </span>
    </span>
  )
}
