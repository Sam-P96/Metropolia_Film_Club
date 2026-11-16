import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChallengeCard from '../gomoku/ChallengeCard'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import ResonanceIcon from '../resonance/ResonanceIcon'
import { POOL_CHALLENGES, poolPath } from './PoolChallenge'
import { formatDeadline } from '../../utils/farkle'
import { timeAgo } from '../../utils/timeAgo'
import { formatPoints } from '../../../../shared/pool/rules.js'

// Dark enough to read on every Notifications background, the white one too.
const BOX = 'rounded-2xl border bg-[#1d0c1e]/90 p-5 shadow-xl shadow-black/30 backdrop-blur-md sm:p-6'
const BUTTON = 'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold transition'
const PLAY = `${BUTTON} bg-gradient-to-r from-[#c2185b] to-[#7b2ff7] text-white hover:brightness-110`
const SEE = `${BUTTON} border border-white/20 bg-white/5 text-white hover:border-[#ff4d8d]/60 hover:bg-white/10`

const HEADINGS = {
  poolChallenge: '8 Ball Pool challenge',
  poolAccepted: 'Challenge accepted',
  poolDeclined: 'Challenge declined',
  poolExpired: 'Challenge expired',
  poolOver: 'Game over',
  poolLive: 'Pool, live now',
  poolBetTaken: 'Your bet is on',
  poolBetWon: 'Bet won',
  poolBetLost: 'Bet lost',
  poolBetBack: 'Bet handed back',
}

const opponentOf = (match) => (match.mySeat >= 0 ? match.players[1 - match.mySeat] : null)
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
      <Link to={`/users/${player._id}`} className="font-semibold text-white hover:text-[#ff9ec7]">
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

function Points({ amount }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold text-brand-gold">
      <CoinIcon kind="ppp" size={15} /> {formatPoints(amount)} P-PP
    </span>
  )
}

// Into the game: "Take your shot", "Watch Live" while it's someone else's,
// "See the game" once it's over.
function GameButton({ match }) {
  const to = poolPath(match._id)
  if (match.status === 'active' && match.mySeat >= 0 && match.current === match.mySeat) {
    return (
      <Link to={to} className={PLAY}>
        Take your shot
      </Link>
    )
  }
  if (match.status === 'active') {
    return (
      <Link to={to} className={PLAY}>
        {match.here?.length > 0 && <LiveDot />}
        {match.mySeat >= 0 ? 'Watch Live' : 'Watch and bet'}
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
      <h2 className="text-sm font-semibold tracking-widest text-[#ff9ec7] uppercase">{children}</h2>
      {chip && <span className="rounded-full bg-[#ff4d8d] px-2 text-[11px] font-semibold text-white uppercase">{chip}</span>}
      {at && <span className="text-xs text-white/40">{timeAgo(at)}</span>}
    </div>
  )
}

// A game being played right now, at the top of the Notifications page with
// the other games (always, until it ends): who, whose shot, and the way in.
export function OngoingPool({ match }) {
  const them = opponentOf(match)
  const yourTurn = match.current === match.mySeat
  const here = Boolean(match.here?.includes(String(them?._id)))
  const where = `shot ${match.shots + 1}, ${stakes(match)}`

  return (
    <article className={`${BOX} ${yourTurn ? 'border-[#ff4d8d]/70' : 'border-emerald-400/50'}`}>
      <Heading chip="Pool">{yourTurn ? 'Your shot' : 'Their shot'}</Heading>
      <div className="flex items-start gap-4">
        <Face player={them} />
        <div className="min-w-0 flex-1">
          <p className="text-lg text-white/90">
            {yourTurn ? (
              <>
                Your shot against <PlayerName player={them} />: {where}.
              </>
            ) : (
              <>
                <PlayerName player={them} />
                &apos;s shot: {where}.
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
              ? `Shoot by ${formatDeadline(match.forfeitAt)}, or the game goes to them.`
              : `They have until ${formatDeadline(match.forfeitAt)} to shoot, or the game is yours.`}
          </p>
          <div className="mt-4">
            <GameButton match={match} />
          </div>
        </div>
      </div>
    </article>
  )
}

const HOW = { eight: 'sank the 8 ball', eightFoul: 'sank the 8 ball too soon', resign: 'resigned', forfeit: 'ran out of time', left: 'left the club' }

// How a finished game went, from a player's side.
function result(match, name) {
  const youWon = match.winner === match.mySeat
  const loserDid = match.endedBy !== 'eight' ? HOW[match.endedBy] : null
  if (youWon) {
    return (
      <>
        You beat {name}
        {loserDid ? ` (who ${loserDid})` : ', sinking the 8 ball'}
        {match.forFun ? '' : ' and won '}
        {!match.forFun && <Points amount={match.prize} />}.
      </>
    )
  }
  return (
    <>
      {loserDid ? `You ${loserDid}, so ` : ''}
      {name} won the game{loserDid ? '' : ', sinking the 8 ball'}.
    </>
  )
}

// A game for points that ended for a member you follow.
function followedResult(item) {
  const { pool: match } = item
  const winner = match.players[match.winner]
  const loser = match.players[1 - match.winner]
  const followsWinner = item.actors.some((actor) => actor._id === winner._id)
  const how = match.endedBy !== 'eight' ? HOW[match.endedBy] : null

  if (followsWinner) {
    return {
      heading: 'Pool win',
      face: winner,
      text: (
        <>
          <PlayerName player={winner} /> beat <PlayerName player={loser} />
          {how ? ` (who ${how})` : ' at 8 Ball Pool'} and won <Points amount={match.prize} />.
        </>
      ),
    }
  }
  return {
    heading: 'Pool loss',
    face: loser,
    text: (
      <>
        <PlayerName player={loser} /> {how ? `${how} and ` : ''}lost {formatPoints(match.stake)} to <PlayerName player={winner} /> at 8 Ball Pool.
      </>
    ),
  }
}

// The two players, as "A vs B".
function Versus({ match }) {
  return (
    <>
      <PlayerName player={match.players[0]} /> vs <PlayerName player={match.players[1]} />
    </>
  )
}

// An 8 Ball Pool notification (backend/utils/notify.js), like Infinite
// Gomoku's: a picture, what happened, and a way into the game. A challenge
// waiting on you is pinned until you answer, and answers right here.
export default function PoolNotice({ item }) {
  const [match, setMatch] = useState(item.pool)

  if (item.type === 'poolChallenge') {
    return (
      <article className={`${BOX} ${item.pinned ? 'border-[#ff4d8d]/70' : 'border-white/10'}`}>
        <Heading chip={item.pinned ? 'Pinned' : null} at={item.at}>
          {HEADINGS.poolChallenge}
        </Heading>
        {match.status === 'challenge' ? (
          <ChallengeCard match={match} onChange={(now) => now && setMatch(now)} game={POOL_CHALLENGES} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-white/80">This challenge has been answered.</p>
            <Link to="/games/pool" className={SEE}>
              Your games
            </Link>
          </div>
        )}
      </article>
    )
  }

  const them = opponentOf(match) ?? item.actors[0]
  const actor = item.actors[0]
  const name = <PlayerName player={actor ?? them} />
  let heading = HEADINGS[item.type] ?? '8 Ball Pool'
  let face = actor ?? them
  let text
  let button = <GameButton match={match} />

  switch (item.type) {
    case 'poolResult': {
      const told = followedResult(item)
      heading = told.heading
      face = item.actors.length === 1 ? item.actors[0] : told.face
      text = told.text
      break
    }
    case 'poolLive': {
      face = item.actors[0]
      text = (
        <>
          <Versus match={match} />: a game of 8 Ball Pool is on{match.forFun ? '' : ` for ${formatPoints(match.stake)} each`}. Watch it live and bet on
          who wins.
        </>
      )
      break
    }
    case 'poolAccepted':
      text = (
        <>
          {name} accepted your {match.counters > 0 ? 'terms' : 'challenge'}: {stakes(match)}. They break.
        </>
      )
      break
    case 'poolDeclined':
      text = (
        <>
          {name} turned down your challenge ({stakes(match)}).{match.forFun ? '' : ' Nothing was taken from either of you.'}
        </>
      )
      button = null
      break
    case 'poolExpired':
      text = <>{name} didn&apos;t answer your challenge within three days, so it expired.</>
      button = null
      break
    case 'poolBetTaken':
      text = (
        <>
          {name} took your bet of {formatPoints(item.amount)} on <Versus match={match} />. It&apos;s on: whoever backed the winner takes both.
        </>
      )
      break
    case 'poolBetWon':
      text = (
        <>
          You won your bet on <Versus match={match} />
          {actor ? <> against {name}</> : ''}: <Points amount={item.amount} />.
        </>
      )
      break
    case 'poolBetLost':
      text = (
        <>
          You lost your bet of {formatPoints(item.amount)} on <Versus match={match} />
          {actor ? <> to {name}</> : ''}.
        </>
      )
      break
    case 'poolBetBack':
      text = (
        <>
          Nobody took your bet of {formatPoints(item.amount)} on <Versus match={match} /> before the game ended, so it&apos;s back in your wallet.
        </>
      )
      face = match.players[0]
      break
    default:
      text = result(match, name)
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
