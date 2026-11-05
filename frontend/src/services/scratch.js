import { api } from './api'

// Box Office Scratch on the server (backend/utils/scratch.js). A card comes
// back as { _id, ticketType ('standard' | 'premium' | 'vip'), status
// ('active' | 'complete'), hash, price, spent: { pp, ppp }, tiles,
// scratched, scratchesLeft, starsFound, tier, goldenFound, jackpotAmount,
// completedAt, revealedAt }. `tiles` has the 16 positions: 'star', 'blank'
// or 'golden' for those scratched, null for the rest (what's under them
// never leaves the server until the card is done).

// Every ticket type's pool, and the latest winners of them all: { amounts:
// { standard, premium, vip }, recent: [{ username, amount, at, ticketType }] }.
export function getJackpot() {
  return api('/scratch/jackpot')
}

// Whether each ticket type is on sale now, by the server's clock: { vip:
// { open, opensAt, closesAt, changesIn }, ... }, `changesIn` in ms, or null
// for a type that's always on sale.
export function getTicketHours() {
  return api('/scratch/hours')
}

// The card to show: the one being scratched, or the last finished one not
// yet revealed. { card }, null if neither.
export function getCurrentCard() {
  return api('/scratch/card')
}

// A new ticket of `type`: takes the price, PP first and then P-PP.
export function buyCard(type) {
  return api('/scratch/cards', { method: 'POST', body: { type } })
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
