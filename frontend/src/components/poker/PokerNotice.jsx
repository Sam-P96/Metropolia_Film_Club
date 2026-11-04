import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import ResonanceIcon from '../resonance/ResonanceIcon'
import PokerLogo from './PokerLogo'
import { getCurrentUserId } from '../../utils/currentUser'
import { timeAgo } from '../../utils/timeAgo'

// Dark enough to read on every Notifications background, like Farkle's.
const BOX = 'rounded-2xl border bg-plum/90 p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6'
const PLAY = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'
const GLOW_SMALL = '0 0 14px 1px rgba(250,188,63,0.35)'
const GLOW_BIG = '0 0 30px 4px rgba(250,188,63,0.6)'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

// A green dot that pulses: the table is live.
function LiveDot() {
  return (
    <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-300" />
    </span>
  )
}

function Name({ member }) {
  return (
    <>
      <Link to={`/users/${member._id}`} className="font-semibold text-white hover:text-brand-gold">
        {member.username}
      </Link>
      <ResonanceIcon userId={member._id} className="ml-1" />
    </>
  )
}

// "Sam", "Sam and Alex", "Sam, Alex and Kim", as links.
function Names({ members }) {
  return members.map((member, index) => (
    <Fragment key={member._id}>
      {index > 0 && (index === members.length - 1 ? ' and ' : ', ')}
      <Name member={member} />
    </Fragment>
  ))
}

// The Kino Poker table while members are playing at it, at the top of
// Notifications beside the Farkle games (backend: table.js liveFor): who's
// there, and the way in. `table` is { members, bots, queue, seats,
// playing, you }, `you` being 'seated', 'queued' or null.
export function PokerLive({ table }) {
  const me = getCurrentUserId()
  const others = table.members.filter((member) => member._id !== me)
  const full = table.members.length >= table.seats
  const bots = table.bots ? `, with ${plural(table.bots, 'bot')}` : ''
  const join = table.you === 'seated' ? 'Back to the table' : table.you === 'queued' ? 'Back to the queue' : full ? 'Join the queue' : 'Join'

  return (
    <article className={`${BOX} border-emerald-400/50`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">Kino Poker</h2>
        <span className="rounded-full bg-emerald-400 px-2 text-[11px] font-semibold text-ink uppercase">Live</span>
      </div>
      <div className="flex items-start gap-4">
        <div className="flex shrink-0 -space-x-3" aria-hidden="true">
          {table.members.slice(0, 3).map((member) => (
            <Link key={member._id} to={`/users/${member._id}`} tabIndex={-1} className="rounded-full ring-2 ring-plum">
              <MemberAvatar user={member} size="lg" />
            </Link>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {table.you === 'seated' ? (
              <>
                You&apos;re at the table
                {others.length > 0 && (
                  <>
                    {' '}
                    with <Names members={others} />
                  </>
                )}
                {bots}.
              </>
            ) : (
              <>
                <Names members={table.members} /> {table.members.length === 1 ? 'is' : 'are'} playing 5-Card Draw{bots}.
              </>
            )}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <LiveDot /> {table.playing ? 'A hand is being played right now' : 'Between hands'}
            {table.queue > 0 && <span className="font-normal text-white/50">· {table.queue} waiting</span>}
          </p>
          <div className="mt-4">
            <Link to="/games/poker/table" className={PLAY}>
              {join}
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

// A Kino Poker win (backend/utils/notify.js notePokerWin), sent to every
// member: someone left the table ahead. Gold glass, glowing, with how much
// they won, how many hands, and their best hand at a showdown. The winner
// sees "You".
export default function PokerNotice({ item }) {
  const reduce = useReducedMotion()
  const winner = item.actors[0]
  const mine = winner._id === getCurrentUserId()
  const { hands = 0, best = null } = item.poker ?? {}

  return (
    <motion.article
      initial={{ boxShadow: GLOW_SMALL }}
      animate={reduce ? { boxShadow: GLOW_BIG } : { boxShadow: [GLOW_SMALL, GLOW_BIG, GLOW_SMALL] }}
      transition={reduce ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      className="rounded-2xl border-2 border-brand-gold/80 bg-black/75 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-['Bebas_Neue'] text-xl tracking-[0.2em] text-brand-gold">Kino Poker</h2>
        <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
      </div>
      <div className="flex items-start gap-4">
        <Link to={`/users/${winner._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
          <MemberAvatar user={winner} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">{mine ? 'You' : <Name member={winner} />} left the table a winner:</p>
          <p className="mt-1 flex items-center gap-1.5 font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-brand-gold drop-shadow-[0_0_10px_rgba(250,188,63,0.5)]">
            <CoinIcon kind="ppp" size={26} /> +{item.amount} P-PP
          </p>
          <p className="mt-2 text-sm text-white/70">
            {plural(hands, 'hand')} won
            {best && (
              <>
                {' '}
                · Best hand: <span className="font-semibold text-white">{best}</span>
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link to="/games/poker" className={PLAY}>
              Play Kino Poker
            </Link>
          </div>
        </div>
        <div className="hidden shrink-0 sm:block">
          <PokerLogo />
        </div>
      </div>
    </motion.article>
  )
}
