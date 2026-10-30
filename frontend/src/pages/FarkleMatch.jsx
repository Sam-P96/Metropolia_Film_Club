import '@fontsource/cinzel'
import { useState } from 'react'

import CoinIcon from '../components/wallet/CoinIcon'
import DiceTray from '../components/farkle/DiceTray'
import MatchLog from '../components/farkle/MatchLog'
import Scoreboard from '../components/farkle/Scoreboard'
import ScoringGuide from '../components/farkle/ScoringGuide'
import StakePicker from '../components/farkle/StakePicker'
import TurnControls from '../components/farkle/TurnControls'
import useServerFarkle, { selectionOf } from '../hooks/useServerFarkle'
import useWallet from '../hooks/useWallet'
import { BOT_NAME, formatPoints } from '../../../shared/farkle/rules.js'

// "Mon 3 Nov, 14:05", in the member's own time.
function deadline(iso) {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Asks before giving up, since it costs the stake.
function GiveUpButton({ stake, disabled, onGiveUp }) {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAsking(true)}
        className="cursor-pointer text-sm text-white/60 underline underline-offset-4 hover:text-white disabled:cursor-default disabled:opacity-40"
      >
        Give up
      </button>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-white/80">Lose your {formatPoints(stake)}?</span>
      <button
        type="button"
        onClick={() => {
          setAsking(false)
          onGiveUp()
        }}
        className="cursor-pointer rounded-lg bg-brand-red px-3 py-1 font-medium text-white hover:bg-brand-orange"
      >
        Give up
      </button>
      <button type="button" onClick={() => setAsking(false)} className="cursor-pointer text-brand-gold underline underline-offset-4">
        Keep playing
      </button>
    </span>
  )
}

function Header({ children, aside }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-['Cinzel'] text-4xl text-white">
          Kino <span className="text-brand-gold">Farkle</span>
        </h1>
        <p className="mt-1 text-white/60">{children}</p>
      </div>
      {aside}
    </header>
  )
}

// Farkle against the bot, for points. The server plays it (Phase 3); the
// game itself is in useServerFarkle, and this page lays it out and wires up
// the buttons. With no game going, it's the stake picker.
export default function FarkleMatch() {
  const { game, loading, roll, bank, toggleDie, resign, start, playAgain } = useServerFarkle()
  const wallet = useWallet()

  // The last game's winning score and stake, so Play again starts there.
  const [last, setLast] = useState(null)

  const page = 'mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:py-12'

  if (loading) {
    return (
      <div className={page}>
        <Header>Shuffling the dice…</Header>
      </div>
    )
  }

  if (!game) {
    return (
      <div className={page}>
        <Header>You against {BOT_NAME}, for points.</Header>
        <StakePicker wallet={wallet} onStart={start} initial={last} />
        <ScoringGuide />
      </div>
    )
  }

  const pick = selectionOf(game)
  const choosing = game.current === 0 && game.phase === 'choosing'
  const betweenMoves = game.current === 0 && (game.phase === 'ready' || choosing)

  return (
    <div className={page}>
      <Header
        aside={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm tabular-nums text-white/80">
              Stake {formatPoints(game.stake)} · win
              <CoinIcon kind="ppp" size={15} />
              <span className="font-bold text-brand-gold">{formatPoints(game.prize)} P-PP</span>
            </span>
            {game.phase !== 'over' && <GiveUpButton stake={game.stake} disabled={!betweenMoves} onGiveUp={resign} />}
          </div>
        }
      >
        You vs. {game.opponent}. First to {formatPoints(game.target)} wins.
      </Header>

      <Scoreboard
        players={game.players}
        scores={game.scores}
        current={game.current}
        winner={game.winner}
        target={game.target}
        over={game.phase === 'over'}
      />

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

      <TurnControls
        game={game}
        pick={pick}
        opponent={game.opponent}
        onRoll={roll}
        onBank={bank}
        onPlayAgain={() => {
          setLast({ target: game.target, stake: game.stake })
          playAgain()
        }}
      />

      {betweenMoves && (
        <p className="-mt-2 text-center text-sm text-white/50">
          Three days without a move and you lose: move by {deadline(game.forfeitAt)}.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <ScoringGuide />
        <MatchLog log={game.log} />
      </div>
    </div>
  )
}
