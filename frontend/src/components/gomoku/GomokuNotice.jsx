import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChallengeCard from './ChallengeCard'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import ResonanceIcon from '../resonance/ResonanceIcon'
import { formatDeadline } from '../../utils/farkle'
import { boardName } from '../../utils/gomoku'
import { timeAgo } from '../../utils/timeAgo'
import { formatPoints } from '../../../../shared/gomoku/rules.js'

// Dark enough to read on every Notifications background, the white one too.
const BOX = 'rounded-2xl border bg-plum/90 p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6'
const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold transition'
const PLAY = `${BUTTON} bg-brand-gold text-ink hover:brightness-110`
const SEE = `${BUTTON} border border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10`

const HEADINGS = {
  gomokuChallenge: 'Gomoku challenge',
  gomokuAccepted: 'Challenge accepted',
  gomokuDeclined: 'Challenge declined',
  gomokuExpired: 'Challenge expired',
  gomokuOver: 'Game over',
}

const opponentOf = (match) => match.players[1 - match.mySeat]
const opponentHere = (match) => Boolean(match.here?.includes(String(opponentOf(match)?._id)))
const stakes = (match) => (match.forFun ? 'For Fun' : `${formatPoints(match.stake)} each`)

function LiveDot() {
  return (
    <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-300" />
    </span>
  )
}

function PlayerName({ player }) {
  if (!player?._id) return player?.username ?? 'A former member'
  return (
    <>
      <Link to={`/users/${player._id}`} className="font-semibold text-white hover:text-brand-gold">
        {player.username}
      </Link>
      <ResonanceIcon userId={player._id} className="ml-1" />
    </>
  )
}

function Face({ player }) {
  const avatar = <MemberAvatar user={player ?? { username: '?' }} size="lg" />
  if (!player?._id) return <span className="shrink-0">{avatar}</span>
  return (
    <Link to={`/users/${player._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
      {avatar}
    </Link>
  )
}

function Prize({ match }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold text-brand-gold">
      <CoinIcon kind="ppp" size={15} /> {formatPoints(match.prize)} P-PP
    </span>
  )
}

// Into the game: "Play your turn", "Watch Live" while it's theirs, "See the
// game" once it's over.
function GameButton({ match }) {
  const to = `/games/gomoku/${match._id}`
  if (match.status === 'active' && match.current === match.mySeat) {
    return (
      <Link to={to} className={PLAY}>
        Play your turn
      </Link>
    )
  }
  if (match.status === 'active') {
    return (
      <Link to={to} className={PLAY}>
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

function Heading({ children, chip, at }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">{children}</h2>
      {chip && <span className="rounded-full bg-brand-gold px-2 text-[11px] font-semibold text-ink uppercase">{chip}</span>}
      {at && <span className="text-xs text-white/40">{timeAgo(at)}</span>}
    </div>
  )
}

// A game being played right now, at the top of the Notifications page with
// the Farkle games (always, until it ends): who, whose turn, and the way in.
export function OngoingGomoku({ match }) {
  const them = opponentOf(match)
  const yourTurn = match.current === match.mySeat
  const here = opponentHere(match)
  const where = `move ${match.moveCount + 1} on a ${boardName(match.size)} board, ${stakes(match)}`

  return (
    <article className={`${BOX} ${yourTurn ? 'border-brand-gold/70' : 'border-emerald-400/50'}`}>
      <Heading chip="Gomoku">{yourTurn ? 'Your turn' : 'Their turn'}</Heading>
      <div className="flex items-start gap-4">
        <Face player={them} />
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {yourTurn ? (
              <>
                Your move against <PlayerName player={them} />: {where}.
              </>
            ) : (
              <>
                <PlayerName player={them} />
                &apos;s move: {where}.
              </>
            )}
          </p>
          {here && (
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <LiveDot /> {them.username} is at the board right now.
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

// How a finished game went, from the viewer's side. `name` is a link, so
// it only ever goes between words.
function result(match, name) {
  if (match.endedBy === 'draw') {
    return (
      <>
        You and {name} filled the board without five in a row: a draw.{match.forFun ? '' : ' Your stakes are back.'}
      </>
    )
  }
  const youWon = match.winner === match.mySeat
  if (youWon) {
    const how = { resign: ', who resigned,', forfeit: ', who ran out of time,', left: ', who left the club,' }[match.endedBy] ?? ''
    return match.forFun ? (
      <>
        You beat {name}
        {how.replace(/,$/, '')}
        {match.endedBy === 'five' ? ' with five in a row' : ''}.
      </>
    ) : (
      <>
        You beat {name}
        {how} and won <Prize match={match} />.
      </>
    )
  }
  const how = { resign: 'You resigned', forfeit: 'Three days went by without your move' }[match.endedBy]
  return (
    <>
      {how ? `${how}, so ` : ''}
      {name} won the game{how ? '' : ' with five in a row'}.
    </>
  )
}

// A game for points that ended for a member you follow: who won how much
// from whom, from the winner's side if you follow them.
function followedResult(item) {
  const { gomoku: match } = item
  const winner = match.players[match.winner]
  const loser = match.players[1 - match.winner]
  const followsWinner = item.actors.some((actor) => actor._id === winner._id)
  const how = { resign: 'resigned', forfeit: 'ran out of time', left: 'left the club' }[match.endedBy]

  if (followsWinner) {
    return {
      heading: 'Gomoku win',
      face: winner,
      text: (
        <>
          <PlayerName player={winner} /> beat <PlayerName player={loser} />
          {how ? ` (who ${how})` : ' at Infinite Gomoku'} and won <Prize match={match} />.
        </>
      ),
    }
  }
  return {
    heading: 'Gomoku loss',
    face: loser,
    text: (
      <>
        <PlayerName player={loser} /> {how ? `${how} and ` : ''}lost {formatPoints(match.stake)} to <PlayerName player={winner} /> at Infinite
        Gomoku.
      </>
    ),
  }
}

// An Infinite Gomoku notification (backend/utils/notify.js), like Farkle's:
// the other player's picture, what happened, and a way into the game. A
// challenge waiting on you is pinned until you answer, and answers right
// here.
export default function GomokuNotice({ item }) {
  const [match, setMatch] = useState(item.gomoku)

  if (item.type === 'gomokuChallenge') {
    return (
      <article className={`${BOX} ${item.pinned ? 'border-brand-gold/70' : 'border-white/10'}`}>
        <Heading chip={item.pinned ? 'Pinned' : null} at={item.at}>
          {HEADINGS.gomokuChallenge}
        </Heading>
        {match.status === 'challenge' ? (
          <ChallengeCard match={match} onChange={(now) => now && setMatch(now)} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-white/80">This challenge has been answered.</p>
            <Link to="/games/gomoku" className={SEE}>
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

  if (item.type === 'gomokuResult') {
    const told = followedResult(item)
    heading = told.heading
    face = item.actors.length === 1 ? item.actors[0] : told.face
    text = told.text
  } else if (item.type === 'gomokuAccepted') {
    text = (
      <>
        {name} accepted your {match.counters > 0 ? 'terms' : 'challenge'}: {boardName(match.size)}, {stakes(match)}. They move first.
      </>
    )
    button = <GameButton match={match} />
  } else if (item.type === 'gomokuDeclined') {
    text = (
      <>
        {name} turned down your challenge ({boardName(match.size)}, {stakes(match)}).{match.forFun ? '' : ' Nothing was taken from either of you.'}
      </>
    )
  } else if (item.type === 'gomokuExpired') {
    text = <>{name} didn&apos;t answer your challenge within three days, so it expired.</>
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
