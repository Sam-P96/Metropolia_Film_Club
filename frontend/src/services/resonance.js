import { api } from './api'

// Resonance, the taste match from members' film ratings
// (backend/utils/resonanceStore.js). Everything needs a login.

// Whether the logged-in member can use it:
// { on, icon, rated, needed, eligible, waiting }.
export function getMyResonance() {
  return api('/resonance/me')
}

// The home page's pool of strong matches: { matches }.
export function getResonanceSuggestions() {
  return api('/resonance/suggestions')
}

// A page of the Resonance page. `side` is 'resonance' or 'dissonance';
// `search` keeps only the names with it in. Resolves to
// { standing, matches (each with its `rank`), total, hasMore, next }.
export function getResonanceRanking(side, offset = 0, search = '') {
  const params = new URLSearchParams({ side, offset })
  if (search) params.set('q', search)
  return api(`/resonance/ranking?${params}`)
}

// The comparison page: the logged-in member's match with `userId`, as the
// card has it, each one's average rating, and every film both have rated,
// A to Z: { match, averages: { mine, theirs }, films }, each film
// { tmdbId, title, year, posterPath, mine, theirs, trueDifference,
// similarity }, where mine and theirs are { rating, reviewId (or null) },
// trueDifference is how far apart the ratings are as Resonance counts them
// (each against its rater's average, but none for the same top or bottom
// rating), in stars, and similarity how alike that makes them, 0 to 100.
// Fails with a 404 when they have no Resonance with that member they may
// see.
export function getResonanceWith(userId) {
  return api(`/resonance/with/${userId}`)
}

// /SECRETresonance, moderators and admins only: every pair, a page at a
// time. `min` is '20' or 'any'; `member` an id to see only theirs, or ''.
// Resolves to { members, pairs, total, hasMore, next, updatedAt }, where
// `updatedAt` is when members' stored Resonance was last worked out.
export function getEveryonesResonance({ min, member, offset = 0 }) {
  const params = new URLSearchParams({ min, offset })
  if (member) params.set('member', member)
  return api(`/resonance/all?${params}`)
}

// /SECRETresonance's "Update Resonance now", moderators and admins only:
// works everyone's out again straight away instead of at 04:00. Resolves to
// { members, pairs, updatedAt }.
export function updateResonanceNow() {
  return api('/resonance/update', { method: 'POST' })
}

// { [member id]: { percent, icon } } for everyone they share a Soul
// Resonance with. `icon` is false when either of them has it turned off.
export function getSoulResonance() {
  return api('/resonance/soul')
}
