import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChallengeCard from './ChallengeCard'
import CoinIcon from '../wallet/CoinIcon'
import { formatDeadline } from '../../utils/farkle'
import { timeAgo } from '../../utils/timeAgo'
import { formatPoints } from '../../../../shared/farkle/rules.js'

// Dark enough to read on every Notifications background, the white one too.
const BOX = 'rounded-2xl border bg-plum/90 p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6'
const LINK = 'inline-flex min-h-11 items-center rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110'

const HEADINGS = {
  farkleChallenge: 'Farkle challenge',
  farkleTurn: 'Your turn',
  farkleAccepted: 'Challenge accepted',
  farkleDeclined: 'Challenge declined',
  farkleExpired: 'Challenge expired',
  farkleOver: 'Game over',
}

// How a finished game went, from the viewer's side.
function result(match, name) {
  const youWon = match.winner === match.mySeat
  const prize = (
    <span className="inline-flex items-center gap-1 font-bold text-brand-gold">
      <CoinIcon kind="ppp" size={15} /> {formatPoints(match.prize)} P-PP
    </span>
  )

  if (youWon) {
    const how = { resign: `${name} gave up`, forfeit: `${name} ran out of time`, left: `${name} left the club` }[match.endedBy]
    return <>You beat {name}{how ? ` (${how})` : ''} and won {prize}.</>
  }

  const how = { resign: 'You gave up', forfeit: 'Three days went by without your move' }[match.endedBy]
  return <>{how ? `${how}, so ` : ''}{name} won the game{how ? '' : ` with ${formatPoints(match.scores[match.winner])}`}.</>
}

// A Farkle notification between members (backend/utils/notify.js). Pinned
// ones, a challenge waiting on you or your turn, have a gold border and stay
// at the top until you act. The challenge card answers right here.
export default function FarkleNotice({ item }) {
  const [match, setMatch] = useState(item.match)
  const them = item.actors[0] ?? null
  const name = them ? (
    <Link to={`/users/${them._id}`} className="font-semibold text-white hover:text-brand-gold">
      {them.username}
    </Link>
  ) : (
    'A former member'
  )
  const gameLink = `/games/farkle/${match._id}`
  const mine = match.scores?.[match.mySeat] ?? 0
  const theirs = match.scores?.[1 - match.mySeat] ?? 0

  let body
  if (item.type === 'farkleChallenge') {
    body =
      match.status === 'challenge' ? (
        <ChallengeCard match={match} onChange={(now) => now && setMatch(now)} />
      ) : (
        <p className="text-white/80">
          This challenge has been answered.{' '}
          <Link to="/games/farkle" className="text-brand-gold underline underline-offset-4">
            Your games
          </Link>
        </p>
      )
  } else if (item.type === 'farkleTurn') {
    body = (
      <>
        <p className="text-lg text-white/90">
          Your move against {name}: {formatPoints(mine)} to {formatPoints(theirs)}, first to {formatPoints(match.target)}.
        </p>
        {match.status === 'active' && (
          <p className="mt-1 text-sm text-white/50">Move by {formatDeadline(match.forfeitAt)}, or the game goes to them.</p>
        )}
        <Link to={gameLink} className={`${LINK} mt-4`}>
          Play your turn
        </Link>
      </>
    )
  } else if (item.type === 'farkleAccepted') {
    body = (
      <p className="text-lg text-white/90">
        {name} accepted your {match.counters > 0 ? 'terms' : 'challenge'}: first to {formatPoints(match.target)}, {formatPoints(match.stake)} each.{' '}
        <Link to={gameLink} className="text-brand-gold underline underline-offset-4">
          See the game
        </Link>
      </p>
    )
  } else if (item.type === 'farkleDeclined') {
    body = (
      <p className="text-lg text-white/90">
        {name} turned down your challenge (first to {formatPoints(match.target)}, {formatPoints(match.stake)} each). Nothing was taken from
        either of you.
      </p>
    )
  } else if (item.type === 'farkleExpired') {
    body = (
      <p className="text-lg text-white/90">
        {name} didn't answer your challenge within three days, so it expired. Nothing was taken from either of you.
      </p>
    )
  } else {
    body = (
      <p className="text-lg text-white/90">
        {result(match, name)}{' '}
        <Link to={gameLink} className="text-brand-gold underline underline-offset-4">
          See the game
        </Link>
      </p>
    )
  }

  return (
    <article className={`${BOX} ${item.pinned ? 'border-brand-gold/70' : 'border-white/10'}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">{HEADINGS[item.type]}</h2>
        {item.pinned && <span className="rounded-full bg-brand-gold px-2 text-[11px] font-semibold text-ink uppercase">Pinned</span>}
        <span className="text-xs text-white/40">{timeAgo(item.at)}</span>
      </div>
      {body}
    </article>
  )
}
