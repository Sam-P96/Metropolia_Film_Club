import { api, cachedApi, clearCache } from './api'

// Every member, A to Z. Name, title, avatar and banner only.
export function getUsers() {
  return cachedApi('/users')
}

// A full profile, or { restricted: true, ... } for someone else's private one.
export function getUser(id) {
  return api(`/users/${encodeURIComponent(id)}`)
}

export function getUserReviews(id) {
  return api(`/users/${encodeURIComponent(id)}/reviews`)
}

// Their film list. Fails with 403 if the profile is private.
export function getUserFilms(id) {
  return api(`/users/${encodeURIComponent(id)}/films`)
}

// Only the fields a member may change: bio, privacy, memberTitle, avatarUrl,
// reviewCardBanner, favouriteFilms. Resolves to the saved profile.
export async function updateMe(changes) {
  const profile = await api('/users/me', { method: 'PATCH', body: changes })
  clearCache('/users')
  return profile
}
