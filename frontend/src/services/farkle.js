import { api } from './api'

// Farkle on the server. A match comes back as { _id, mode, status, version,
// target, stake, prize, mySeat, players: [{ _id, username, bot }], scores,
// current, turn, phase, dice, kept, turnPoints, hotDice, lastTurns, log,
// winner, endedBy, forfeitAt }. Seats are 0 and 1, and `mySeat` is the
// logged-in member's (hooks/useServerFarkle.js turns it round).

// Their open game against the bot: { match }, null if they have none.
export function getBotMatch() {
  return api('/farkle/bot')
}

// A new game against the bot. Takes the stake straight away; the match
// comes back with the bot's first turn already played.
export function startBotMatch({ target, stake }) {
  return api('/farkle/bot', { method: 'POST', body: { target, stake } })
}

export function getMatch(id) {
  return api(`/farkle/matches/${id}`)
}

// A move: { version, type: 'roll' | 'bank' | 'resign', keep: [indexes] }.
// Resolves to the match after it, with the bot's reply already played.
export function sendMove(id, move) {
  return api(`/farkle/matches/${id}/moves`, { method: 'POST', body: move })
}
