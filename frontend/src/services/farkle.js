import { api } from './api'

// Farkle on the server. A match comes back as { _id, mode, status, version,
// target, stake, prize, mySeat, players: [{ _id, username, bot }], scores,
// current, turn, phase, dice, kept, turnPoints, hotDice, lastTurns, log,
// winner, endedBy, forfeitAt }. Seats are 0 and 1, and `mySeat` is the
// logged-in member's (hooks/useServerFarkle.js turns it round). Between
// members it also has the challenge: { offer: { by, to, at }, counters,
// expiresAt, myAnswer, acceptStake, counterMax }.

// The lobby: { bot, incoming, outgoing, games, recent }, each a match (or
// a list of them).
export function getLobby() {
  return api('/farkle/lobby')
}

// The most the logged-in member can challenge `userId` for: { max }.
export function getStakeLimit(userId) {
  return api(`/farkle/limit/${userId}`)
}

// A challenge to another member. Nothing is taken until they accept.
export function sendChallenge({ opponent, target, stake }) {
  return api('/farkle/challenges', { method: 'POST', body: { opponent, target, stake } })
}

// Answering a challenge: 'accept', 'decline', 'counter' (with target and
// stake) or 'withdraw' (taking back your own). `version` is the match
// version the terms were seen on. Resolves to the match after it.
export function answerChallenge(id, answer, { version, target, stake } = {}) {
  return api(`/farkle/matches/${id}/${answer}`, { method: 'POST', body: { version, target, stake } })
}

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
