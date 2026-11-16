import { api } from './api'

// 8 Ball Pool on the server (backend/routes/poolRouter.js). A game comes
// back as { _id, status, version, stake, prize, forFun, mySeat, watching,
// players: [{ _id, username, avatarUrl }], shots, seen, current, solids,
// breakShot, hand, left: [n, n], balls: [{ id, x, y, on }], lastShot,
// winner, endedBy, forfeitAt, here }, and while it's a challenge: { offer,
// counters, expiresAt, myAnswer, acceptStake, counterMax }. Seat 0 breaks.
// vs Clanker never comes here: it's played in the browser.

// The shop: cues and Ignitions. { pp, ppp, points, owned, cue, ignition },
// `cue` and `ignition` what they use.
export function getPoolShop() {
  return api('/pool/shop')
}

// Each resolves to { view }, the shop as it now is (buying: { done, view }).
export function buyPoolItem(itemId) {
  return api('/pool/shop/buy', { method: 'POST', body: { itemId } })
}

// `kind`: 'cue' or 'ignition'. `itemId` null: back to the free one.
export function equipPoolItem(kind, itemId) {
  return api('/pool/shop/equip', { method: 'PUT', body: { kind, itemId } })
}

// The game's page: { incoming, outgoing, games, recent, watch }.
export function getPoolLobby() {
  return api('/pool/lobby')
}

// The most the logged-in member can play `userId` for: { max }.
export function getPoolStakeLimit(userId) {
  return api(`/pool/limit/${userId}`)
}

// A page of their friends, the most points first: { friends, hasMore, next }.
export function getPoolFriends(skip = 0) {
  return api(`/pool/friends?skip=${skip}`)
}

// A challenge: { opponent, stake } (stake 0 is For Fun).
export function sendPoolChallenge({ opponent, stake }) {
  return api('/pool/challenges', { method: 'POST', body: { opponent, stake } })
}

// 'accept', 'decline', 'counter' (with a stake) or 'withdraw'.
export function answerPoolChallenge(id, answer, { version, stake } = {}) {
  return api(`/pool/matches/${id}/${answer}`, { method: 'POST', body: { version, stake } })
}

export function getPoolMatch(id) {
  return api(`/pool/matches/${id}`)
}

// { version, type: 'shot', angle, power, cue } or { version, type: 'resign' }.
export function sendPoolShot(id, shot) {
  return api(`/pool/matches/${id}/shots`, { method: 'POST', body: shot })
}

// They've seen the game up to `shots` shots.
export function markPoolSeen(id, shots) {
  return api(`/pool/matches/${id}/seen`, { method: 'POST', body: { shots } })
}

// ---- The crowd's bets. Each answers { bets, canBet, maxBet }.

export function getPoolBets(id) {
  return api(`/pool/matches/${id}/bets`)
}

// A bet of `amount` on the player in seat `side`.
export function placePoolBet(id, { side, amount }) {
  return api(`/pool/matches/${id}/bets`, { method: 'POST', body: { side, amount } })
}

export function takePoolBet(betId) {
  return api(`/pool/bets/${betId}/take`, { method: 'POST' })
}

export function withdrawPoolBet(betId) {
  return api(`/pool/bets/${betId}/withdraw`, { method: 'POST' })
}
