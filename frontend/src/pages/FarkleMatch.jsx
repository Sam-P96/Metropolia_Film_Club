import '@fontsource/cinzel'

import DiceTray from '../components/farkle/DiceTray'
import MatchLog from '../components/farkle/MatchLog'
import Scoreboard from '../components/farkle/Scoreboard'
import ScoringGuide from '../components/farkle/ScoringGuide'
import TurnControls from '../components/farkle/TurnControls'
import useLocalFarkle, { BOT, PLAYERS, selectionOf } from '../hooks/useLocalFarkle'
import { WINNING_SCORES, formatPoints } from '../../../shared/farkle/rules.js'

// Farkle against the bot, all in the browser (Phase 1). The game itself is
// in useLocalFarkle; this page only lays it out and wires up the buttons.
export default function FarkleMatch() {
  const { game, roll, bank, toggleDie, restart } = useLocalFarkle(4000)
  const pick = selectionOf(game)
  const choosing = game.current === 0 && game.phase === 'choosing'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-['Cinzel'] text-4xl text-white">
            Kino <span className="text-brand-gold">Farkle</span>
          </h1>
          <p className="mt-1 text-white/60">
            You vs. {BOT}. First to {formatPoints(game.target)} wins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div role="group" aria-label="Winning score" className="flex overflow-hidden rounded-xl border border-white/15">
            {WINNING_SCORES.map((target) => (
              <button
                key={target}
                type="button"
                aria-pressed={game.target === target}
                onClick={() => restart(target)}
                className={`cursor-pointer px-3 py-2 text-sm tabular-nums ${
                  game.target === target ? 'bg-brand-gold font-bold text-ink' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {formatPoints(target)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => restart()} className="cursor-pointer text-sm text-brand-gold underline underline-offset-4">
            New game
          </button>
        </div>
      </header>

      <Scoreboard
        players={PLAYERS}
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

      <TurnControls game={game} pick={pick} opponent={BOT} onRoll={roll} onBank={bank} onPlayAgain={() => restart()} />

      <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <ScoringGuide />
        <MatchLog log={game.log} />
      </div>
    </div>
  )
}