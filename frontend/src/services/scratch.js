import { api } from './api'

// Box Office Scratch on the server (backend/utils/scratch.js). A card comes
// back as { _id, status ('active' | 'complete'), hash, price, spent: { pp,
// ppp }, tiles, scratched, scratchesLeft, starsFound, tier, goldenFound,
// jackpotAmount, completedAt, revealedAt }. `tiles` has the 16 positions:
// 'star', 'blank' or 'golden' for those scratched, null for the rest (what's
// under them never leaves the server until the card is done).

// The pool and its latest winners: { amount, recent: [{ username, amount, at }] }.
export function getJackpot() {
  return api('/scratch/jackpot')
}

// The card to show: the one being scratched, or the last finished one not
// yet revealed. { card }, null if neither.
export function getCurrentCard() {
  return api('/scratch/card')
}

// A new ticket: takes the price, PP first and then P-PP.
export function buyCard() {
  return api('/scratch/cards', { method: 'POST' })
}

// One scratch: { card, tile: { index, content } }.
export function scratchTile(cardId, tile) {
  return api(`/scratch/cards/${cardId}/scratch`, { method: 'POST', body: { tile } })
}

// End the card now, leaving its scratches left unused.
export function collectCard(cardId) {
  return api(`/scratch/cards/${cardId}/collect`, { method: 'POST' })
}

// Once it's done: { layout, salt, hash }, to show every tile and check them
// against the seal.
export function revealCard(cardId) {
  return api(`/scratch/cards/${cardId}/reveal`)
}
