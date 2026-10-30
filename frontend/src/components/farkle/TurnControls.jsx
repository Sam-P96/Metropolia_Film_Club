import { formatPoints } from '../../../../shared/farkle/rules.js'

const BUTTON = 'flex min-h-14 flex-col items-center justify-center rounded-xl px-3 py-1.5 text-lg font-bold transition disabled:cursor-default disabled:opacity-40'
const PRIMARY = `${BUTTON} cursor-pointer bg-brand-gold text-ink hover:brightness-110`
const SECONDARY = `${BUTTON} cursor-pointer border border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10`

// Roll and Bank, with a line under each saying what it will do. When the
// game is over, one Play again button instead.
export default function TurnControls({ game, pick, opponent, onRoll, onBank, onPlayAgain }) {
  if (game.phase === 'over') {
    return (
      <button type="button" onClick={onPlayAgain} className={`${PRIMARY} w-full`}>
        Play again
        <small className="text-sm font-medium opacity-75">First to {formatPoints(game.target)}</small>
      </button>
    )
  }

  const yourTurn = game.current === 0
  const ready = yourTurn && game.phase === 'ready'
  const choosing = yourTurn && game.phase === 'choosing'
  const canKeep = choosing && pick.points > 0
  const nextRoll = pick.diceLeft === 0 ? 6 : pick.diceLeft

  let rollLabel = 'Roll'
  let rollHint = 'Wait…'
  if (!yourTurn) rollHint = `${opponent}'s turn`
  else if (ready) [rollLabel, rollHint] = ['Roll 6 dice', 'Start your turn']
  else if (canKeep) {
    rollLabel = `Roll ${nextRoll} ${nextRoll === 1 ? 'die' : 'dice'}`
    rollHint = pick.diceLeft === 0 ? `Keep ${formatPoints(pick.points)} · hot dice` : `Keep ${formatPoints(pick.points)}`
  } else if (choosing) rollHint = 'Pick scoring dice first'

  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={onRoll} disabled={!(ready || canKeep)} className={PRIMARY}>
        {rollLabel}
        <small className="text-sm font-medium opacity-75">{rollHint}</small>
      </button>
      <button type="button" onClick={onBank} disabled={!canKeep} className={SECONDARY}>
        {canKeep ? `Bank ${formatPoints(game.turnPoints + pick.points)}` : 'Bank'}
        <small className="text-sm font-medium text-white/60">{canKeep ? 'End turn, keep points' : 'Set aside dice first'}</small>
      </button>
    </div>
  )
}