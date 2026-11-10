import { stakeProblem } from '../../../shared/gomoku/rules.js'

// What's wrong with terms typed in (components/gomoku/TermsPicker.jsx), or
// '' if nothing is. For Fun needs nothing; for PP, `stakeText` is a whole
// number from the minimum up to `max` (what the poorer of the two has).
export function termsHint(forFun, stakeText, max) {
  if (forFun) return ''
  if (stakeText === '') return 'Pick a stake, or type your own.'
  return stakeProblem(Number(stakeText), max)
}

// "15 × 15"
export const boardName = (size) => `${size} × ${size}`

// How a game between members ended, from the viewer's side, in a few
// words: "You won with five in a row", "They resigned", "A draw".
export function endingOf(match, opponent) {
  if (match.endedBy === 'draw') return 'A draw: the board filled up'
  const youWon = match.winner === match.mySeat
  const how = {
    five: youWon ? 'You won with five in a row' : `${opponent} won with five in a row`,
    resign: youWon ? `${opponent} resigned` : 'You resigned',
    forfeit: youWon ? `${opponent} ran out of time` : 'Three days went by without your move',
    left: `${opponent} left the club`,
  }
  return how[match.endedBy] ?? (youWon ? 'You won' : `${opponent} won`)
}
