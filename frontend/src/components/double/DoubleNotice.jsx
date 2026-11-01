import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import { formatPoints } from '../../hooks/useDoubleOrNothing'
import { getCurrentUserId } from '../../utils/currentUser'
import { timeAgo } from '../../utils/timeAgo'
import { GLASS } from './glass'

const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'
const GLOW_SMALL = '0 0 14px 1px rgba(16,185,129,0.4)'
const GLOW_BIG = '0 0 30px 4px rgba(16,185,129,0.7)'
const LETTER = { win: 'W', draw: 'D', loss: 'L' }

// The player's picture and name, both linking to their profile.
function playerParts(user) {
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

function Heading({ at, children }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.2em] text-emerald-400">{children}</h2>
      <span className="text-xs text-white/40">{timeAgo(at)}</span>
    </div>
  )
}

// A Double or Nothing notification (backend/utils/notify.js).
//   doublePlay  a member you follow played and didn't win: how their
//               rounds went, which list they're on, and the pot now
//   doubleWin   someone won: on black glass with a glowing emerald border,
//               sent to every member (the winner sees "You won")
// Both have a way into the game.
export default function DoubleNotice({ item }) {
  const reduce = useReducedMotion()
  const { face, name } = playerParts(item.actors[0])
  const { game } = item
  const went = game.results.map((result) => LETTER[result]).join(', ')
  const late = game.auto ? ' (out of time)' : ''

  if (item.type === 'doubleWin') {
    const mine = item.actors[0]._id === getCurrentUserId()
    return (
      <motion.article
        initial={{ boxShadow: GLOW_SMALL }}
        animate={reduce ? { boxShadow: GLOW_BIG } : { boxShadow: [GLOW_SMALL, GLOW_BIG, GLOW_SMALL] }}
        transition={reduce ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-2xl border-2 border-emerald-500 bg-black/75 p-5 backdrop-blur-xl sm:p-6"
      >
        <Heading at={item.at}>Double or Nothing</Heading>
        <div className="flex items-start gap-4">
          {face}
          <div className="min-w-0 flex-1">
            <p className="text-lg text-white/90">
              {mine ? 'You' : name} beat the pot! {mine ? 'You' : 'They'} went {went} on {formatPoints(game.bet)}
              {late} and won:
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.5)]">
              <CoinIcon kind="ppp" size={26} /> {formatPoints(item.amount)} P-PP
            </p>
            {game.bonusWon > 0 && (
              <p className="mt-1 text-sm font-semibold text-emerald-300">
                Including the {formatPoints(game.bonusWon)} bonus pot!
              </p>
            )}
            <Link to="/games/double-or-nothing" className={`${BUTTON} mt-4`}>
              Take on the pot
            </Link>
          </div>
        </div>
      </motion.article>
    )
  }

  const list = game.outcome === 'ban' ? 'landed on the Ban List' : 'joined the Waiting List'
  return (
    <article className={`${GLASS} p-5 sm:p-6`}>
      <Heading at={item.at}>Double or Nothing</Heading>
      <div className="flex items-start gap-4">
        {face}
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {name} went {went} on {formatPoints(game.bet)}
            {late} and {list}. The pot is now{' '}
            <span className="font-bold text-brand-gold">{formatPoints(game.newBet)}</span>.
          </p>
          <Link to="/games/double-or-nothing" className={`${BUTTON} mt-4`}>
            Play Double or Nothing
          </Link>
        </div>
      </div>
    </article>
  )
}
