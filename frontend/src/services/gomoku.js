import { api } from './api'

// Infinite Gomoku on the server (backend/routes/gomokuRouter.js). A game
// comes back as { _id, status, version, size, stake, prize, forFun, mySeat,
// players: [{ _id, username, avatarUrl, look: { piece, shockwave } }],
// myLook: { piece, shockwave, board, grid }, moves: [{ x, y, seat }],
// moveCount, lastMove, seen, current, winner, winLine, endedBy, forfeitAt },
// and while it's a challenge: { offer, counters, expiresAt, myAnswer,
// acceptStake, counterMax }. Seat 0 moves first. Play Local never comes
// here: it's played in the browser.

// The game's page: { incoming, outgoing, games, recent, myLook }.
export function getGomokuLobby() {
  return api('/gomoku/lobby')
}

// The most the logged-in member can play `userId` for: { max }.
export function getGomokuStakeLimit(userId) {
  return api(`/gomoku/limit/${userId}`)
}

// A page of their friends, the most points first: { friends, hasMore, next }.
export function getGomokuFriends(skip = 0) {
  return api(`/gomoku/friends?skip=${skip}`)
}

// A challenge: { opponent, size, stake } (stake 0 is For Fun).
export function sendGomokuChallenge({ opponent, size, stake }) {
  return api('/gomoku/challenges', { method: 'POST', body: { opponent, size, stake } })
}

// 'accept', 'decline', 'counter' (with size and stake) or 'withdraw'.
export function answerGomokuChallenge(id, answer, { version, size, stake } = {}) {
  return api(`/gomoku/matches/${id}/${answer}`, { method: 'POST', body: { version, size, stake } })
}

export function getGomokuMatch(id) {
  return api(`/gomoku/matches/${id}`)
}

// { version, type: 'place', x, y } or { version, type: 'resign' }.
export function sendGomokuMove(id, move) {
  return api(`/gomoku/matches/${id}/moves`, { method: 'POST', body: move })
}

// They've seen the game up to `moves` moves.
export function markGomokuSeen(id, moves) {
  return api(`/gomoku/matches/${id}/seen`, { method: 'POST', body: { moves } })
}

// The shop: { pp, ppp, points, owned, equipped }.
export function getGomokuShop() {
  return api('/gomoku/shop')
}

// Each resolves to { done, view }, `view` being the shop as it now is.
export function buyGomokuItem(itemId) {
  return api('/gomoku/shop/buy', { method: 'POST', body: { itemId } })
}

export function equipGomokuItem(kind, itemId) {
  return api('/gomoku/shop/equip', { method: 'PUT', body: { kind, itemId } })
}

// ---- Developer tools: only answer on your own computer (backend
// middleware/devTools.js), and only used by pages that only exist in the
// Vite dev server.

export function getGomokuDev() {
  return api('/gomoku/dev')
}

export function devAcceptAsThem(id) {
  return api(`/gomoku/dev/matches/${id}/accept`, { method: 'POST' })
}

export function devPlayTheirMove(id, point = {}) {
  return api(`/gomoku/dev/matches/${id}/their-move`, { method: 'POST', body: point })
}

export function devUnsee(id) {
  return api(`/gomoku/dev/matches/${id}/unsee`, { method: 'POST' })
}

export function devRefundShop() {
  return api('/gomoku/dev/shop/refund', { method: 'POST' })
}
