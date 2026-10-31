import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import { GoldenTicketIcon, StarIcon } from './TileFace'
import { timeAgo } from '../../utils/timeAgo'
import { SCRATCH } from '../../../../shared/scratch/config.js'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'
const GLOW_SMALL = '0 0 14px 1px rgba(250,188,63,0.45)'
const GLOW_BIG = '0 0 30px 4px rgba(250,188,63,0.75)'

const tierByKey = (key) => SCRATCH.tiers.find((tier) => tier.key === key) ?? null
const format = (points) => points.toLocaleString('en-US')

// The winner's picture and name, both linking to their profile.
function winnerParts(user) {
  return {
    face: (
      <Link to={`/users/${user._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
        <MemberAvatar user={user} size="lg" />
      </Link>
    ),
    name: (
      <Link to={`/users/${user._id}`} className="font-semibold text-white hover:text-brand-gold">
        {user.username}
      </Link>
    ),
  }
}

// A Box Office Scratch notification (backend/utils/notify.js).
//   scratchWin      a member you follow won a tier: their picture and
//                   name, the tier and the prize, on ticket blue
//   scratchJackpot  someone hit the jackpot: on black glass with a glowing
//                   gold border, sent to every member
// Both have a way into the game.
export default function ScratchNotice({ item }) {
  const reduce = useReducedMotion()
  const { face, name } = winnerParts(item.actors[0])

  if (item.type === 'scratchJackpot') {
    return (
      <motion.article
        initial={{ boxShadow: GLOW_SMALL }}
        animate={reduce ? { boxShadow: GLOW_BIG } : { boxShadow: [GLOW_SMALL, GLOW_BIG, GLOW_SMALL] }}
        transition={reduce ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-2xl border-2 border-brand-gold bg-black/75 p-5 backdrop-blur-xl sm:p-6"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <GoldenTicketIcon className="w-7" />
          <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.2em] text-brand-gold">Jackpot</h2>
          <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
        </div>
        <div className="flex items-start gap-4">
          {face}
          <div className="min-w-0 flex-1">
            <p className="text-lg text-white/90">{name} found the Golden Ticket and hit the Box Office Scratch jackpot!</p>
            <p className="mt-1 flex items-center gap-1.5 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.5)]">
              <CoinIcon kind="ppp" size={26} /> {format(item.amount)} P-PP
            </p>
            <Link to="/games/scratch" className={`${BUTTON} mt-4`}>
              Try your luck
            </Link>
          </div>
        </div>
      </motion.article>
    )
  }

  const tier = tierByKey(item.tier)
  return (
    <article className="rounded-2xl border border-white/10 bg-ticket/90 p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StarIcon className="size-5" />
        <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">Box Office Scratch</h2>
        <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-start gap-4">
        {face}
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {tier?.refund ? (
              <>
                {name} scratched <span className="font-semibold text-white">{tier.name}</span> and got the ticket price back.
              </>
            ) : (
              <>
                {name} scratched <span className="font-semibold text-white">{tier?.name ?? 'a win'}</span> and won{' '}
                <span className="inline-flex items-center gap-1 font-bold text-brand-gold">
                  <CoinIcon kind="ppp" size={15} /> {format(item.amount)} P-PP
                </span>
                .
              </>
            )}
          </p>
          <Link to="/games/scratch" className={`${BUTTON} mt-4`}>
            Play Box Office Scratch
          </Link>
        </div>
      </div>
    </article>
  )
}
