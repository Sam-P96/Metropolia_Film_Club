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
// reviewCardBanner, levelStyle, pvp, allowComments, favouriteFilms. Resolves
// to the saved profile.
export async function updateMe(changes) {
  const profile = await api('/users/me', { method: 'PATCH', body: changes })
  clearCache('/users')
  return profile
}

// Follow or unfollow a member. Resolves to their follow state: followerCount,
// followingCount, isFollowing, followsYou, isFriend and followListAccess.
export function followUser(id) {
  return api(`/users/${encodeURIComponent(id)}/follow`, { method: 'PUT' })
}

export function unfollowUser(id) {
  return api(`/users/${encodeURIComponent(id)}/follow`, { method: 'DELETE' })
}

// A page of a member's followers or the members they follow ('followers' or
// 'following'), newest first. { owner, access, users, total, hasMore, next }.
// Fails with 403 if their followPrivacy setting keeps it from you.
export function getFollowList(id, kind, skip = 0) {
  return api(`/users/${encodeURIComponent(id)}/${kind}?skip=${skip}`)
}

// Everything we hold about the logged-in member: account, reviews, film logs.
export function exportMyData() {
  return api('/users/me/export')
}

// Delete the account and all of its data. Cannot be undone.
export async function deleteMe() {
  await api('/users/me', { method: 'DELETE' })
  clearCache('/users')
}
