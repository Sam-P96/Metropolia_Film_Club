import '@fontsource/cinzel'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import ChallengeCard from '../components/farkle/ChallengeCard'
import CoinIcon from '../components/wallet/CoinIcon'
import DiceTray from '../components/farkle/DiceTray'
import MatchLog from '../components/farkle/MatchLog'
import Scoreboard from '../components/farkle/Scoreboard'
import ScoringGuide from '../components/farkle/ScoringGuide'
import StakePicker from '../components/farkle/StakePicker'
import TurnControls from '../components/farkle/TurnControls'
import useServerFarkle, { selectionOf } from '../hooks/useServerFarkle'
import useWallet from '../hooks/useWallet'
import { formatDeadline } from '../utils/farkle'
import { BOT_MODE, BOT_NAME, formatPoints } from '../../../shared/farkle/rules.js'

const CARD = 'rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md sm:p-6'
const PAGE = 'mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:py-12'

// Why a challenge never became a game.
const CLOSED = {
  declined: 'This challenge was turned down. Nothing was taken from either of you.',
  expired: 'Nobody answered this challenge within three days, so it expired. Nothing was taken from either of you.',
  withdrawn: 'This challenge was taken back. Nothing was taken from either of you.',
}

const FOLD_BUTTON =
  'flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl px-6 py-1.5 text-lg font-bold transition disabled:cursor-default disabled:opacity-40'

// The Fold button, at the bottom of the page: give up the game, and with it
// the stake. It asks first, since it can't be undone. Only between moves
// (yours, or while you wait for theirs), so it never crosses a roll.
function FoldButton({ stake, opponent, disabled, onFold }) {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAsking(true)}
        className={`${FOLD_BUTTON} w-full bg-brand-red text-white hover:bg-brand-orange sm:mx-auto sm:w-80`}
      >
        Fold
        <small className="text-sm font-medium opacity-80">Give up and lose your {formatPoints(stake)}</small>
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-red/60 bg-brand-red/15 p-5 text-center">
      <p className="text-white">
        Fold? {opponent} wins the game, and your {formatPoints(stake)} is gone.
      </p>
      <div className="grid w-full grid-cols-2 gap-3 sm:w-96">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setAsking(false)
            onFold()
          }}
          className={`${FOLD_BUTTON} bg-brand-red text-white hover:bg-brand-orange`}
        >
          Fold
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className={`${FOLD_BUTTON} border border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10`}
        >
          Keep playing
        </button>
      </div>
    </div>
  )
}

// Play Live, in a game between members: whether the other player has the
// game open too, so their rolls and taps show here as they happen. If
// another of your games has taken Play Live, a button to bring it back.
function LiveBadge({ live, opponent }) {
  if (live.bumped) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm text-amber-100">
        You're playing live in another game, so this one is by notification for now.
        <button
          type="button"
          onClick={live.playLiveHere}
          className="cursor-pointer rounded-lg bg-brand-gold px-3 py-1 font-bold text-ink transition hover:brightness-110"
        >
          Play Live here
        </button>
      </div>
    )
  }

  if (!live.on) return null

  if (!live.opponentHere) {
    return (
      <p className="text-center text-sm text-white/50">
        Play Live is on. {opponent} doesn't have the game open, so they'll get a notification when it's their turn.
      </p>
    )
  }

  return (
    <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-emerald-300">
      <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
      </span>
      Play Live: {opponent} is here, and every roll shows as it happens.
    </p>
  )
}

// Slides up and fades in as the page opens (animate-page-in in index.css).
// `step` is how far down the page it sits, so the parts arrive one after
// another. Only on first showing: the game changing underneath doesn't
// replay it.
function Enter({ step = 0, children }) {
  return (
    <div className="animate-page-in motion-reduce:animate-none" style={{ animationDelay: `${step * 80}ms` }}>
      {children}
    </div>
  )
}

function Header({ children, aside }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link to="/games/farkle" className="text-sm text-white/60 hover:text-white">
          ← Farkle
        </Link>
        <h1 className="mt-2 font-['Cinzel'] text-4xl text-white">
          Kino <span className="text-brand-gold">Farkle</span>
        </h1>
        <p className="mt-1 text-white/60">{children}</p>
      </div>
      {aside}
    </header>
  )
}

// One game of Farkle, played on the server (the game itself is in
// useServerFarkle; this lays it out and wires up the buttons). Without a
// `matchId` it's the member's game against the bot, or the stake picker if
// they have none going. With one, it's a game between members, or the
// challenge it still is.
function FarkleGame({ matchId }) {
  const navigate = useNavigate()
  const { game, match, loading, live, roll, bank, toggleDie, resign, start, playAgain, adopt } = useServerFarkle(matchId)
  const wallet = useWallet()

  // The last bot game's winning score and stake, so Play again starts there.
  const [last, setLast] = useState(null)

  if (loading) {
    return (
      <div className={PAGE}>
        <Enter>
          <Header>Shuffling the dice…</Header>
        </Enter>
      </div>
    )
  }

  if (!game && !matchId) {
    return (
      <div className={PAGE}>
        <Enter>
          <Header>{BOT_MODE}: you against {BOT_NAME}, for points.</Header>
        </Enter>
        <Enter step={1}>
          <StakePicker wallet={wallet} onStart={start} initial={last} />
        </Enter>
        <Enter step={2}>
          <ScoringGuide />
        </Enter>
      </div>
    )
  }

  if (!game) {
    const opponent = match?.players[1 - match.mySeat]?.username

    return (
      <div className={PAGE}>
        <Enter>
          <Header>{match ? `You and ${opponent}.` : 'Game not found.'}</Header>
        </Enter>
        <Enter step={1}>
          {match?.status === 'challenge' ? (
            <div className={`${CARD} border-brand-gold/60`}>
              <ChallengeCard match={match} onChange={adopt} />
            </div>
          ) : (
            <p className={`${CARD} text-white/80`}>
              {CLOSED[match?.status] ?? "This game doesn't exist, or it isn't yours."}{' '}
              <Link to="/games/farkle" className="text-brand-gold underline underline-offset-4">
                Back to Farkle
              </Link>
            </p>
          )}
        </Enter>
      </div>
    )
  }

  const pvp = match?.mode === 'pvp'
  const pick = selectionOf(game)
  const choosing = game.current === 0 && game.phase === 'choosing'
  const betweenMoves = game.current === 0 && (game.phase === 'ready' || choosing)
  const waiting = game.phase === 'waiting'

  return (
    <div className={PAGE}>
      <Enter>
        <Header
          aside={
            <span className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm tabular-nums text-white/80">
              {pvp ? `Stake ${formatPoints(game.stake)} each · winner takes` : `Stake ${formatPoints(game.stake)} · win`}
              <CoinIcon kind="ppp" size={15} />
              <span className="font-bold text-brand-gold">{formatPoints(game.prize)} P-PP</span>
            </span>
          }
        >
          You vs. {game.opponent}. First to {formatPoints(game.target)} wins.
        </Header>
      </Enter>

      {pvp && game.phase !== 'over' && <LiveBadge live={live} opponent={game.opponent} />}

      <Enter step={1}>
        <Scoreboard
          players={game.players}
          scores={game.scores}
          current={game.current}
          winner={game.winner}
          target={game.target}
          over={game.phase === 'over'}
        />
      </Enter>

      <Enter step={2}>
        <DiceTray
          dice={game.dice}
          kept={game.kept}
          selected={game.selected}
          rolling={game.phase === 'rolling'}
          canChoose={choosing}
          onToggle={toggleDie}
          message={game.message}
          tone={game.tone}
          turnPoints={game.turnPoints}
          selectedPoints={pick.points}
          badPick={choosing && game.selected.length > 0 && pick.points === 0}
        />
      </Enter>

      <Enter step={3}>
        <TurnControls
          game={game}
          pick={pick}
          opponent={game.opponent}
          onRoll={roll}
          onBank={bank}
          onPlayAgain={() => {
            if (matchId) {
              navigate('/games/farkle')
              return
            }
            setLast({ target: game.target, stake: game.stake })
            playAgain()
          }}
        />
      </Enter>

      {betweenMoves && (
        <p className="-mt-2 text-center text-sm text-white/50">
          Three days without a move and you lose: move by {formatDeadline(game.forfeitAt)}.
        </p>
      )}
      {waiting && (
        <p className="-mt-2 text-center text-sm text-white/50">
          You'll get a notification when it's your turn. {game.opponent} has until {formatDeadline(game.forfeitAt)} to move, or the game is
          yours.
        </p>
      )}

      <Enter step={4}>
        <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <ScoringGuide />
          <MatchLog log={game.log} them={pvp ? game.opponent : BOT_NAME} />
        </div>
      </Enter>

      {game.phase !== 'over' && (
        <Enter step={5}>
          <FoldButton stake={game.stake} opponent={game.opponent} disabled={!(betweenMoves || waiting)} onFold={resign} />
        </Enter>
      )}
    </div>
  )
}

// /games/farkle/bot and /games/farkle/:matchId. A fresh FarkleGame for
// each match, so nothing from one game carries into the next.
export default function FarkleMatch() {
  const { matchId = null } = useParams()
  return <FarkleGame key={matchId ?? 'bot'} matchId={matchId} />
}
