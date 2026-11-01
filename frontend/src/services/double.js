import { api } from './api'

// Double or Nothing (backend/utils/double.js). The server decides every
// amount and every result; these only ask.

// Everything the page shows: { currentBet, possibleWin, seed, bonusPot,
// bonusCap, bonusEligible, bonusUnlocksAt, nextResetAt, roundSeconds,
// serverNow, wallet: { pp, ppp }, status ('AVAILABLE', 'IN QUEUE' or
// 'BANNED'), canAfford, potInUse ({ name } or null), game (their game in
// progress, or null), recent (the recent plays) }.
export function getDoubleStatus() {
  return api('/double-or-nothing/status')
}

// Starts a game at `expectedBet`, the bet the page showed. Resolves to
// { gameId, bet, roundDeadline, game, serverNow }. A refusal's
// error.data.code says why: POT_CHANGED (with currentBet), POT_IN_USE
// (with playing), BANNED, IN_QUEUE or NOT_ENOUGH_POINTS.
export function startDouble(expectedBet) {
  return api('/double-or-nothing/start', { method: 'POST', body: { expectedBet } })
}

// One throw ('rock', 'paper' or 'scissors') for round `round` of the game.
// Resolves to { round, rounds, game, outcome, payout, bonusWon, newBet,
// serverNow }; outcome is null until the game's decided. A 409 brings the
// game as it is (error.data.game): TIMED_OUT, ROUND_ALREADY_PLAYED or
// GAME_FINISHED.
export function throwDouble(gameId, hand, round) {
  return api('/double-or-nothing/round', { method: 'POST', body: { gameId, throw: hand, round } })
}
