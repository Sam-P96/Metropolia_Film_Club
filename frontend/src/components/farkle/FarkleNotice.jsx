import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChallengeCard from './ChallengeCard'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import { formatDeadline } from '../../utils/farkle'
import { timeAgo } from '../../utils/timeAgo'
import { formatPoints } from '../../../../shared/farkle/rules.js'

// Dark enough to read on every Notifications background, the white one too.
const BOX = 'rounded-2xl border bg-plum/90 p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6'
const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold transition'
const PLAY = `${BUTTON} bg-brand-gold text-ink hover:brightness-110`
const WATCH = `${BUTTON} bg-brand-gold text-ink hover:brightness-110`
const SEE = `${BUTTON} border border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10`

const HEADINGS = {
  farkleChallenge: 'Farkle challenge',
  farkleAccepted: 'Challenge accepted',
  farkleDeclined: 'Challenge declined',
  farkleExpired: 'Challenge expired',
  farkleOver: 'Game over',
}

const opponentOf = (match) => match.players[1 - match.mySeat]

// Whether the other player has the game open right now (Play Live).
const opponentHere = (match) => Boolean(match.here?.includes(String(opponentOf(match)?._id)))

// A green dot that pulses: someone is at the table right now.
function LiveDot() {
  return (
    <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-300" />
    </span>
  )
}

// A player's name as a link to their profile, or just the name for the bot
// (and for someone who has left the club).
function PlayerName({ player }) {
  if (!player?._id) return player?.username ?? 'A former member'
  return (
    <Link to={`/users/${player._id}`} className="font-semibold text-white hover:text-brand-gold">
      {player.username}
    </Link>
  )
}

// The other player's picture, on the left of every Farkle notification.
function Face({ player }) {
  const avatar = <MemberAvatar user={player ?? { username: '?' }} size="lg" />
  if (!player?._id) return <span className="shrink-0">{avatar}</span>
  return (
    <Link to={`/users/${player._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
      {avatar}
    </Link>
  )
}

// Into the game: "Play your turn" when it's yours, "Watch Live" while it's
// theirs (Play Live shows their rolls as they happen), "See the game" once
// it's over.
function GameButton({ match }) {
  const to = `/games/farkle/${match._id}`
  if (match.status === 'active' && match.current === match.mySeat) {
    return (
      <Link to={to} className={PLAY}>
        Play your turn
      </Link>
    )
  }
  if (match.status === 'active') {
    return (
      <Link to={to} className={WATCH}>
        {opponentHere(match) && <LiveDot />}
        Watch Live
      </Link>
    )
  }
  return (
    <Link to={to} className={SEE}>
      See the game
    </Link>
  )
}

// The heading row: what it is, a chip, and when.
function Heading({ children, chip, at }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">{children}</h2>
      {chip && <span className="rounded-full bg-brand-gold px-2 text-[11px] font-semibold text-ink uppercase">{chip}</span>}
      {at && <span className="text-xs text-white/40">{timeAgo(at)}</span>}
    </div>
  )
}

// A game between members being played right now, at the very top of the
// Notifications page (always, until it ends): the other player's picture,
// the score, whose turn it is, and the way in.
export function OngoingGame({ match }) {
  const them = opponentOf(match)
  const yourTurn = match.current === match.mySeat
  const here = opponentHere(match)
  const score = `${formatPoints(match.scores[match.mySeat])} to ${formatPoints(match.scores[1 - match.mySeat])}, first to ${formatPoints(match.target)}`

  return (
    <article className={`${BOX} ${yourTurn ? 'border-brand-gold/70' : 'border-emerald-400/50'}`}>
      <Heading chip="Game on">{yourTurn ? 'Your turn' : 'Their turn'}</Heading>
      <div className="flex items-start gap-4">
        <Face player={them} />
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {yourTurn ? (
              <>
                Your move against <PlayerName player={them} />: {score}.
              </>
            ) : (
              <>
                <PlayerName player={them} />
                &apos;s move: {score}.
              </>
            )}
          </p>
          {here && (
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <LiveDot /> {them.username} is at the table right now.
            </p>
          )}
          <p className="mt-1 text-sm text-white/50">
            {yourTurn
              ? `Move by ${formatDeadline(match.forfeitAt)}, or the game goes to them.`
              : `They have until ${formatDeadline(match.forfeitAt)} to move, or the game is yours.`}
          </p>
          <div className="mt-4">
            <GameButton match={match} />
          </div>
        </div>
      </div>
    </article>
  )
}

// A game that ended for a member you follow: who won how much from whom.
// Told from the winner's side if you follow the winner (or both).
function followedResult(item) {
  const { match } = item
  const winner = match.players[match.winner]
  const loser = match.players[1 - match.winner]
  const followsWinner = item.actors.some((actor) => actor._id === winner._id)
  const how = { resign: 'folded', forfeit: 'ran out of time', left: 'left the club' }[match.endedBy]

  if (followsWinner) {
    return {
      heading: 'Farkle win',
      face: winner,
      text: (
        <>
          <PlayerName player={winner} /> beat <PlayerName player={loser} />
          {how ? ` (who ${how})` : ''} and won{' '}
          <span className="inline-flex items-center gap-1 font-bold text-brand-gold">
            <CoinIcon kind="ppp" size={15} /> {formatPoints(match.prize)} P-PP
          </span>
          .
        </>
      ),
    }
  }

  return {
    heading: 'Farkle loss',
    face: loser,
    text: (
      <>
        <PlayerName player={loser} /> {how ? `${how} and ` : ''}lost {formatPoints(match.stake)} to <PlayerName player={winner} />.
      </>
    ),
  }
}

// How a finished game went, from the viewer's side. `name` is a link, so it
// only ever goes between words, never inside a `text` template (where it
// would come out as "[object Object]").
function result(match, name) {
  const youWon = match.winner === match.mySeat
  const prize = (
    <span className="inline-flex items-center gap-1 font-bold text-brand-gold">
      <CoinIcon kind="ppp" size={15} /> {formatPoints(match.prize)} P-PP
    </span>
  )

  if (youWon) {
    const how = { resign: 'folded', forfeit: 'ran out of time', left: 'left the club' }[match.endedBy]
    return <>You beat {name}{how ? `, who ${how},` : ''} and won {prize}.</>
  }

  const how = { resign: 'You folded', forfeit: 'Three days went by without your move' }[match.endedBy]
  return <>{how ? `${how}, so ` : ''}{name} won the game{how ? '' : ` with ${formatPoints(match.scores[match.winner])}`}.</>
}

// A Farkle notification (backend/utils/notify.js): the other player's
// picture on the left, what happened, and a way into the game. A challenge
// waiting on you is pinned, with a gold border, until you answer it, and
// answers right here. (Games being played aren't notifications: the page
// lists them above everything with OngoingGame.)
export default function FarkleNotice({ item }) {
  const [match, setMatch] = useState(item.match)

  // A challenge card draws the other player's picture itself.
  if (item.type === 'farkleChallenge') {
    return (
      <article className={`${BOX} ${item.pinned ? 'border-brand-gold/70' : 'border-white/10'}`}>
        <Heading chip={item.pinned ? 'Pinned' : null} at={item.at}>
          {HEADINGS.farkleChallenge}
        </Heading>
        {match.status === 'challenge' ? (
          <ChallengeCard match={match} onChange={(now) => now && setMatch(now)} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-white/80">This challenge has been answered.</p>
            <Link to="/games/farkle" className={SEE}>
              Your games
            </Link>
          </div>
        )}
      </article>
    )
  }

  const them = opponentOf(match) ?? item.actors[0]
  const name = <PlayerName player={item.actors[0] ?? them} />

  let heading = HEADINGS[item.type]
  let face = them
  let text
  let button = null

  if (item.type === 'farkleResult') {
    const told = followedResult(item)
    heading = told.heading
    face = item.actors.length === 1 ? item.actors[0] : told.face
    text = told.text
  } else if (item.type === 'farkleAccepted') {
    text = (
      <>
        {name} accepted your {match.counters > 0 ? 'terms' : 'challenge'}: first to {formatPoints(match.target)},{' '}
        {formatPoints(match.stake)} each.
      </>
    )
    button = <GameButton match={match} />
  } else if (item.type === 'farkleDeclined') {
    text = (
      <>
        {name} turned down your challenge (first to {formatPoints(match.target)}, {formatPoints(match.stake)} each). Nothing was taken
        from either of you.
      </>
    )
  } else if (item.type === 'farkleExpired') {
    text = <>{name} didn&apos;t answer your challenge within three days, so it expired. Nothing was taken from either of you.</>
  } else {
    text = result(match, name)
    button = <GameButton match={match} />
  }

  return (
    <article className={`${BOX} border-white/10`}>
      <Heading at={item.at}>{heading}</Heading>
      <div className="flex items-start gap-4">
        <Face player={face} />
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">{text}</p>
          {button && <div className="mt-4">{button}</div>}
        </div>
      </div>
    </article>
  )
}
