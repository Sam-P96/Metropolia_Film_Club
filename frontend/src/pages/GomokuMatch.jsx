import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import Board from '../components/gomoku/Board'
import ChallengeCard, { Terms } from '../components/gomoku/ChallengeCard'
import GomokuPage, { CARD } from '../components/gomoku/GomokuChrome'
import PlayersBar from '../components/gomoku/PlayersBar'
import { DANGER_BUTTON, GOLD_BUTTON, QUIET_BUTTON } from '../components/steal/style'
import CoinIcon from '../components/wallet/CoinIcon'
import useGomokuGame from '../hooks/useGomokuGame'
import { formatDeadline } from '../utils/farkle'
import { endingOf } from '../utils/gomoku'
import { formatPoints, pointName } from '../../../shared/gomoku/rules.js'

const BACK = { to: '/games/gomoku', label: 'Infinite Gomoku' }

const CLOSED = {
  declined: 'This challenge was turned down.',
  expired: 'Nobody answered this challenge within three days, so it expired.',
  withdrawn: 'This challenge was taken back.',
}

// Resign, under the board: it asks first, since it can't be undone.
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

// Whether the other player is at the board too (Play Live).
function LiveLine({ live, opponent }) {
  if (!live.live) return null
  if (!live.opponentHere) {
    return (
      <p className="text-center text-sm text-white/50">
        Play Live is on. {opponent} doesn&apos;t have the game open, so they&apos;ll see your move land next time they do.
      </p>
    )
  }
  return (
    <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-emerald-300">
      <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
      </span>
      Play Live: {opponent} is at the board, and every move lands as it happens.
    </p>
  )
}

// The line under the board.
function statusOf(match, opponent, selected, myTurn) {
  if (match.status === 'over') {
    const ending = endingOf(match, opponent)
    if (match.endedBy === 'draw') return { tone: 'text-white', text: `${ending}.${match.forFun ? '' : ' Both stakes are back.'}` }
    const youWon = match.winner === match.mySeat
    return {
      tone: youWon ? 'text-brand-gold' : 'text-white/80',
      text: `${ending}.${youWon && !match.forFun ? ` ${formatPoints(match.prize)} P-PP is yours.` : ''}`,
    }
  }
  if (!myTurn) return { tone: 'text-white/70', text: `Waiting for ${opponent}.` }
  if (selected) return { tone: 'text-white', text: `${pointName(match.size, selected.x, selected.y)}: press Place piece, or pick another point.` }
  return { tone: 'text-white', text: match.moveCount === 0 ? 'You move first. Tap a point to pick it.' : 'Your turn. Tap a point to pick it.' }
}

// Over the board once it's over: the winner's name, how, and the prize;
// or that it's a draw.
function resultOf(match) {
  if (match.status !== 'over') return null
  if (match.endedBy === 'draw') {
    return { title: 'Draw', detail: `The board filled up with no five in a row.${match.forFun ? '' : ' Both stakes are back.'}`, tone: 'draw' }
  }
  const winner = match.players[match.winner].username
  const loser = match.players[1 - match.winner].username
  const how = { five: 'Five in a row', resign: `${loser} resigned`, forfeit: `${loser} ran out of time`, left: `${loser} left the club` }[match.endedBy]
  const prize = match.forFun ? '' : ` · ${formatPoints(match.prize)} P-PP`
  return { title: `${winner} wins!`, detail: `${how ?? ''}${prize}`, tone: 'win' }
}

function MatchGame({ matchId }) {
  const game = useGomokuGame(matchId)
  const { match, loading } = game

  if (loading) return <GomokuPage back={BACK} subtitle="Setting up the board…" />

  if (!match) {
    return (
      <GomokuPage back={BACK} subtitle="Game not found.">
        <p className={`${CARD} text-white/80`}>
          {game.error || "This game doesn't exist, or it isn't yours."}{' '}
          <Link to="/games/gomoku" className="text-brand-gold underline underline-offset-4">
            Back to Infinite Gomoku
          </Link>
        </p>
      </GomokuPage>
    )
  }

  const them = match.players[1 - match.mySeat]
  if (match.status === 'challenge' || CLOSED[match.status]) {
    return (
      <GomokuPage back={BACK} subtitle={`You and ${them.username}.`}>
        {match.status === 'challenge' ? (
          <div className={`${CARD} border-brand-gold/60`}>
            <ChallengeCard match={match} onChange={game.adopt} />
          </div>
        ) : (
          <p className={`${CARD} text-white/80`}>
            {CLOSED[match.status]}{' '}
            <Link to="/games/gomoku" className="text-brand-gold underline underline-offset-4">
              Back to Infinite Gomoku
            </Link>
          </p>
        )}
      </GomokuPage>
    )
  }

  const me = match.mySeat
  const over = match.status === 'over'
  const status = statusOf(match, them.username, game.selected, game.myTurn)
  const players = [
    { name: 'You', user: match.players[me], piece: game.pieceFor(me), first: me === 0 },
    { name: them.username, user: them, piece: game.pieceFor(1 - me), first: me === 1 },
  ]
  const side = (seat) => (seat === null || seat === undefined ? null : seat === me ? 0 : 1)

  return (
    <GomokuPage
      back={BACK}
      subtitle={`You vs. ${them.username}.`}
      aside={
        <span className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-center text-sm text-white/80">
          <Terms match={match} />
        </span>
      }
    >
      {!over && <LiveLine live={game.live} opponent={them.username} />}

      <PlayersBar players={players} current={side(match.current)} winner={side(match.winner)} over={over} />

      <Board
        size={match.size}
        moves={match.moves}
        pieceFor={game.pieceFor}
        boardId={match.myLook.board}
        gridId={match.myLook.grid}
        ghost={game.pieceFor(me)}
        selected={game.selected}
        onSelect={game.select}
        canPlay={game.myTurn && !game.busy}
        winLine={match.winLine}
        impact={game.impact}
        result={resultOf(match)}
        label={`The board, ${match.size} by ${match.size}`}
      />

      <p className={`-mt-2 min-h-6 text-center text-lg font-semibold ${status.tone}`} aria-live="polite">
        {status.text}
      </p>

      {!over && (
        <button type="button" onClick={game.place} disabled={!game.selected || !game.myTurn || game.busy} className={`${GOLD_BUTTON} min-h-14 w-full text-center text-lg sm:mx-auto sm:w-80`}>
          {game.busy ? 'Placing…' : 'Place piece'}
        </button>
      )}

      {game.error && (
        <p role="alert" className="text-center text-sm text-red-300">
          {game.error}
        </p>
      )}

      {over ? (
        <div className="flex flex-col items-center gap-3">
          {match.winner === me && !match.forFun && (
            <p className="flex items-center justify-center gap-1.5 text-center text-white/70">
              <CoinIcon kind="ppp" size={16} /> {formatPoints(match.prize)} P-PP added to your wallet.
            </p>
          )}
          <Link to="/games/gomoku" className={`${GOLD_BUTTON} min-h-12 text-center`}>
            Back to Infinite Gomoku
          </Link>
        </div>
      ) : (
        <>
          <p className="-mt-2 text-center text-sm text-white/50">
            {game.myTurn
              ? `Three days without a move and you lose: move by ${formatDeadline(match.forfeitAt)}.`
              : `You'll get a notification when it's your turn. ${them.username} has until ${formatDeadline(match.forfeitAt)} to move, or the game is yours.`}
          </p>
          <ResignButton match={match} opponent={them.username} disabled={game.busy} onResign={game.resign} />
        </>
      )}
    </GomokuPage>
  )
}

// /games/gomoku/:matchId: a game between members, or the challenge it
// still is. A fresh one for each game, so nothing carries over.
export default function GomokuMatch() {
  const { matchId } = useParams()
  return <MatchGame key={matchId} matchId={matchId} />
}
