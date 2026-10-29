import { api } from './api'

// Any logged-in member: a cut of up to 280 characters, sent to their
// followers' Notifications and their own. Resolves to { _id, text, createdAt }.
export function postCut(text) {
  return api('/cuts', { method: 'POST', body: { text } })
}

// Moderators and admins: a page of every member's cuts, newest first, each
// shaped like a cut in the Feed. { items, hasMore, next }.
export function getAllCuts(skip = 0) {
  return api(`/cuts?skip=${skip}`)
}

// One cut, shaped like a cut in the Feed: { _id, type, at, actors, cut },
// where `cut` is { _id, text, likeCount, dislikeCount, myVote, replyCount }.
export function getCut(id) {
  return api(`/cuts/${encodeURIComponent(id)}`)
}

// vote is 'like', 'dislike' or null. Resolves to { likeCount, dislikeCount, myVote }.
export function setCutVote(id, vote) {
  return api(`/cuts/${encodeURIComponent(id)}/vote`, { method: 'PUT', body: { vote } })
}

// The replies under a cut, in the same shape as a review's comments
// (services/comments.js), which is what they are: voting on and deleting
// one goes through there.
export function getCutReplies(id) {
  return api(`/cuts/${encodeURIComponent(id)}/replies`)
}

// `parent` is the reply it answers, or null for one straight under the cut.
// Resolves to the new reply.
export function addCutReply(id, text, parent = null) {
  return api(`/cuts/${encodeURIComponent(id)}/replies`, { method: 'POST', body: { text, parent } })
}

// The cut's author, or a moderator or admin. The server checks.
export function deleteCut(id) {
  return api(`/cuts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
