import { api } from './api'

// Comments under a review, replies included, oldest first. Each has its
// author (`user`), `parent` (the comment it replies to, or null), likeCount,
// dislikeCount and myVote ('like', 'dislike' or null).
export function getComments(reviewId) {
  return api(`/reviews/${encodeURIComponent(reviewId)}/comments`)
}

// Any logged-in member. `parent` is the comment it replies to, or null for
// one straight under the review. Resolves to the new comment, in the same shape.
export function addComment(reviewId, text, parent = null) {
  return api(`/reviews/${encodeURIComponent(reviewId)}/comments`, {
    method: 'POST',
    body: { text, parent },
  })
}

// vote is 'like', 'dislike' or null. Resolves to { likeCount, dislikeCount, myVote }.
export function setCommentVote(id, vote) {
  return api(`/comments/${encodeURIComponent(id)}/vote`, { method: 'PUT', body: { vote } })
}

// The comment's author, or a moderator or admin. The server checks.
export function deleteComment(id) {
  return api(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
