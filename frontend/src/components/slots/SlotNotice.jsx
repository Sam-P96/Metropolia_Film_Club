import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import MemberAvatar from '../profile/MemberAvatar'
import { SymbolTile } from './SymbolArt'
import { formatPoints } from './format'
import { timeAgo } from '../../utils/timeAgo'
import { SLOTS } from '../../../../shared/slots/config.js'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'
const GLOW_SMALL = '0 0 14px 1px rgba(250,188,63,0.45)'
const GLOW_BIG = '0 0 30px 4px rgba(250,188,63,0.75)'
const JACKPOT = SLOTS.symbols.find((symbol) => symbol.jackpot).key

// A Kino Kasino announcement (backend/utils/notify.js), sent to every
// member, on black glass in a glowing brand gold border:
//   slotTriple   someone tripled the credits they put in this session
//   slotJackpot  someone hit the jackpot, and how much the spin won
export default function SlotNotice({ item }) {
  const reduce = useReducedMotion()
  const player = item.actors[0]
  const jackpot = item.type === 'slotJackpot'
  const name = (
    <Link to={`/users/${player._id}`} className="font-semibold text-white hover:text-brand-gold">
      {player.username}
    </Link>
  )

  return (
    <motion.article
      initial={{ boxShadow: GLOW_SMALL }}
      animate={reduce ? { boxShadow: GLOW_BIG } : { boxShadow: [GLOW_SMALL, GLOW_BIG, GLOW_SMALL] }}
      transition={reduce ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      className="rounded-2xl border-2 border-brand-gold bg-black/75 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SymbolTile symbolKey={JACKPOT} size={28} />
        <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.2em] text-brand-gold">{jackpot ? 'Jackpot' : SLOTS.name}</h2>
        <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-start gap-4">
        <Link to={`/users/${player._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
          <MemberAvatar user={player} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          {jackpot ? (
            <>
              <p className="text-lg text-white/90">
                {name} hit the JACKPOT at {SLOTS.name}!
              </p>
              <p className="mt-1 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.5)]">
                +{formatPoints(item.amount ?? 0)} PP
              </p>
            </>
          ) : (
            <p className="text-lg text-white/90">
              {name} tripled their credits at {SLOTS.name}!
            </p>
          )}
          <Link to="/games/slots" className={`${BUTTON} mt-4`}>
            Try your luck
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
