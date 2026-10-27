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

// { films, total }. offset skips that many, for "load more".
export function getMostWanted(limit, offset = 0) {
  return api(`/films/most-wanted?limit=${limit}&offset=${offset}`)
}

// Films with at least one club review, narrowed by the same filters as
// discoverFilms in tmdb.js. Resolves to { films, page, totalPages, totalResults }.
export function getReviewedFilms(filters, page = 1) {
  const params = new URLSearchParams({ page })

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  return api(`/films/reviewed?${params}`)
}

// sort: 'recent' (newest first), 'top' (most liked first) or
// 'controversial' (most disliked first, members with PVP on only). Each
// review has likeCount, dislikeCount and myVote ('like', 'dislike' or null).
export function getReviews(limit, sort = 'recent') {
  return api(`/reviews?limit=${limit}&sort=${sort}`)
}

export function getReview(id) {
  return api(`/reviews/${encodeURIComponent(id)}`)
}

// The thumbs up / down. vote is 'like', 'dislike' or null.
// Resolves to { likeCount, dislikeCount, myVote }.
export function setReviewVote(id, vote) {
  return api(`/reviews/${encodeURIComponent(id)}/vote`, { method: 'PUT', body: { vote } })
}

// The Critics Leaderboard: the top 10 members by the likes ('top') or
// dislikes ('controversial') on their reviews.
// [{ user, likes, dislikes, reviews }]
export function getCritics(sort) {
  return api(`/reviews/critics?sort=${sort}&limit=10`)
}

// Moderators only. Resolves to { containsSpoilers }.
export function setReviewSpoilers(id, containsSpoilers) {
  return api(`/reviews/${encodeURIComponent(id)}/spoilers`, {
    method: 'PUT',
    body: { containsSpoilers },
  })
}

// The review's author only. Off hides its comments without deleting them.
// Resolves to { allowComments }.
export function setReviewAllowComments(id, allowComments) {
  return api(`/reviews/${encodeURIComponent(id)}/allow-comments`, {
    method: 'PUT',
    body: { allowComments },
  })
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
