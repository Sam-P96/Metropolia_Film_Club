import { api, cachedApi, clearCache } from './api'

// The club's own data about films: ratings, reviews, watchlists.
// (TMDB's data about films is in tmdb.js.)

// { [tmdbId]: { average, count, wanting } } for every film anyone has logged.
export function getFilmStats() {
  return cachedApi('/films/stats')
}

export function getTopRated(limit) {
  return api(`/films/top-rated?limit=${limit}`)
}

export function getMostWanted(limit) {
  return api(`/films/most-wanted?limit=${limit}`)
}

export function getRecentReviews(limit) {
  return api(`/reviews?limit=${limit}`)
}

export function getReview(id) {
  return api(`/reviews/${encodeURIComponent(id)}`)
}

export function getFilmReviews(tmdbId) {
  return api(`/films/${tmdbId}/reviews`)
}

// { rating: { average, count }, wantingCount, wanting: [{ ..., user }] }
export function getFilmClub(tmdbId) {
  return api(`/films/${tmdbId}/club`)
}

// The logged-in member's { entry, review } for one film. Either can be null.
export function getMyFilm(tmdbId) {
  return api(`/films/${tmdbId}/me`)
}

// The "Plan to watch" button. Resolves to { entry }, which is null when
// un-planning a film they've never seen removes it altogether.
export async function setPlanned(tmdbId, planned) {
  const result = await api(`/films/${tmdbId}/plan`, { method: 'PUT', body: { planned } })
  clearCache('/films/stats')
  return result
}

// { rating, text, containsSpoilers }. text: null keeps the rating and
// removes any written review. Resolves to { entry, review }.
export async function saveReview(tmdbId, review) {
  const result = await api(`/films/${tmdbId}/review`, { method: 'PUT', body: review })
  clearCache('/films/stats')
  return result
}
