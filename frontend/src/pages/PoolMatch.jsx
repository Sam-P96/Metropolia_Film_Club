import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import ChallengeCard, { Terms } from '../components/gomoku/ChallengeCard'
import BetsPanel from '../components/pool/BetsPanel'
import PoolPage, { CARD } from '../components/pool/PoolChrome'
import { POOL_CHALLENGES } from '../components/pool/PoolChallenge'
import PoolPlay from '../components/pool/PoolPlay'
import ScoreBar from '../components/pool/ScoreBar'
import { endingOf, lastShotText, turnText } from '../components/pool/words'
import { DANGER_BUTTON, GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import CoinIcon from '../components/wallet/CoinIcon'
import usePoolGame from '../hooks/usePoolGame'
import { formatDeadline } from '../utils/farkle'
import { formatPoints } from '../../../shared/pool/rules.js'

const BACK = { to: '/games/pool', label: '8 Ball Pool' }

const CLOSED = {
  declined: 'This challenge was turned down.',
  expired: 'Nobody answered this challenge within three days, so it expired.',
  withdrawn: 'This challenge was taken back.',
}

// Resign, under the table: it asks first, since it can't be undone.
function ResignButton({ match, opponent, disabled, onResign }) {
  const [asking, setAsking] = useState(false)
  const loss = match.forFun ? '' : ` and your ${formatPoints(match.stake)} is gone`

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} disabled={disabled} className={`${QUIET_BUTTON} self-center text-center`}>
        Resign
      </button>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-red/60 bg-brand-red/15 p-4 text-center">
      <p className="text-white">
        Resign? {opponent} wins the game{loss}.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setAsking(false)
            onResign()
          }}
          className={DANGER_BUTTON}
        >
          Resign
        </button>
        <button type="button" onClick={() => setAsking(false)} className={QUIET_BUTTON}>
          Keep playing
        </button>
      </div>
    </div>
  )
}

// Who else has the game open (Play Live).
function LiveLine({ live, match, names }) {
  if (!live.live) return null
  const watching = match.mySeat < 0
  const playerIds = match.players.map((player) => String(player._id))
  const watchers = live.present.filter((id) => !playerIds.includes(id)).length
  const crowd = watchers > 0 ? ` ${watchers} watching.` : ''

  if (watching) {
    const here = match.players.filter((player) => live.present.includes(String(player._id))).map((player) => player.username)
    return (
      <p className="text-center text-sm text-white/60">
        Watching live.{here.length ? ` ${here.join(' and ')} ${here.length > 1 ? 'are' : 'is'} at the table.` : ' Neither player is at the table right now.'}
        {crowd}
      </p>
    )
  }
  const opponent = names[1 - match.mySeat]
  if (!live.opponentHere) {
    return (
      <p className="text-center text-sm text-white/50">
        Play Live is on. {opponent} doesn&apos;t have the game open, so they&apos;ll see your shot play next time they do.{crowd}
      </p>
    )
  }
  return (
    <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-emerald-300">
      <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
      </span>
      Play Live: {opponent} is at the table, and sees your cue as you line up.{crowd}
    </p>
  )
}

function MatchGame({ matchId }) {
  const game = usePoolGame(matchId)
  const { match, shown, loading } = game

  if (loading) return <PoolPage back={BACK} subtitle="Racking up…" />

  if (!match) {
    return (
      <PoolPage back={BACK} subtitle="Game not found.">
        <p className={`${CARD} text-white/80`}>
          {game.error || "This game doesn't exist, or you can't see it."}{' '}
          <Link to="/games/pool" className="text-brand-gold underline underline-offset-4">
            Back to 8 Ball Pool
          </Link>
        </p>
      </PoolPage>
    )
  }

  const me = match.mySeat
  const watching = me < 0
  if (!watching && (match.status === 'challenge' || CLOSED[match.status])) {
    const them = match.players[1 - me]
    return (
      <PoolPage back={BACK} subtitle={`You and ${them.username}.`}>
        {match.status === 'challenge' ? (
          <div className={`${CARD} border-[#ff4d8d]/60`}>
            <ChallengeCard match={match} onChange={game.adopt} game={POOL_CHALLENGES} />
          </div>
        ) : (
          <p className={`${CARD} text-white/80`}>
            {CLOSED[match.status]}{' '}
            <Link to="/games/pool" className="text-brand-gold underline underline-offset-4">
              Back to 8 Ball Pool
            </Link>
          </p>
        )}
      </PoolPage>
    )
  }

  // Your side first; watching, as they sit.
  const names = match.players.map((player, seat) => (seat === me ? 'You' : player.username))
  const order = watching ? [0, 1] : [me, 1 - me]
  const players = order.map((seat) => ({ seat, name: names[seat], user: match.players[seat] }))
  const over = shown.status === 'over'
  const said = lastShotText(shown, names, me)
  const opponent = watching ? null : match.players[1 - me].username
  const youWon = over && shown.winner === me

  return (
    <PoolPage
      back={BACK}
      wide
      subtitle={watching ? `${match.players[0].username} vs. ${match.players[1].username}.` : `You vs. ${opponent}.`}
      aside={
        <span className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-center text-sm text-white/80">
          <Terms match={match} />
        </span>
      }
    >
      {match.status === 'active' && <LiveLine live={game.live} match={match} names={names} />}

      <ScoreBar players={players} game={shown} />

      {over && (
        <div className={`${CARD} ${youWon ? 'border-brand-gold/70' : ''} animate-slide-in motion-reduce:animate-none`} role="status">
          <p className="font-['Bebas_Neue'] text-4xl tracking-wide text-white">
            {youWon ? 'You win!' : `${match.players[shown.winner].username} wins!`}
          </p>
          <p className="text-white/70">{endingOf(shown, names, me)}.</p>
          {!match.forFun && (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-white/70">
              <CoinIcon kind="ppp" size={16} /> {formatPoints(match.prize)} P-PP {youWon ? 'added to your wallet' : 'to the winner'}.
            </p>
          )}
        </div>
      )}

      <PoolPlay
        balls={match.balls}
        hand={game.playing ? null : match.hand}
        shot={game.shot}
        onShotDone={game.shotDone}
        ghost={game.ghost}
        canAim={game.canAim}
        busy={game.busy}
        onShoot={game.shoot}
        onAim={(aim) => game.live.sendAim(aim, !aim.on)}
        myCue={watching ? null : match.players[me]?.look?.cue}
        ghostCue={match.players[watching ? match.current : 1 - me]?.look?.cue}
      />

      <div className="-mt-1 flex min-h-12 flex-col items-center gap-1 text-center" aria-live="polite">
        {said && <p className="text-sm text-white/70">{said}</p>}
        {!over && <p className="text-lg font-semibold text-white">{turnText(shown, names, me)}</p>}
      </div>

      {game.error && (
        <p role="alert" className="text-center text-sm text-red-300">
          {game.error}
        </p>
      )}

      {!watching && !over && match.status === 'active' && (
        <>
          <p className="-mt-2 text-center text-sm text-white/50">
            {game.myTurn
              ? `Three days without a shot and you lose: shoot by ${formatDeadline(match.forfeitAt)}.`
              : `You'll get a notification when it's your shot. ${opponent} has until ${formatDeadline(match.forfeitAt)} to shoot, or the game is yours.`}
          </p>
          <ResignButton match={match} opponent={opponent} disabled={game.busy} onResign={game.resign} />
        </>
      )}

      <BetsPanel matchId={match._id} names={match.players.map((player) => player.username)} changed={game.betsChanged} over={match.status === 'over'} />

      {over && (
        <Link to="/games/pool" className={`${GOLD_BUTTON} min-h-12 self-center text-center`}>
          Back to 8 Ball Pool
        </Link>
      )}
    </PoolPage>
  )
}

// /games/pool/:matchId: a game between members (theirs, or one they're
// watching), or the challenge it still is. A fresh one for each game.
export default function PoolMatch() {
  const { matchId } = useParams()
  return <MatchGame key={matchId} matchId={matchId} />
}
