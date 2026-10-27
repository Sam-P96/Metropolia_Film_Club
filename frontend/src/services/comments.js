import { api } from './api'

// Comments under a review, oldest first. Each has its author (`user`),
// likeCount, dislikeCount and myVote ('like', 'dislike' or null).
export function getComments(reviewId) {
  return api(`/reviews/${encodeURIComponent(reviewId)}/comments`)
}

// Any logged-in member. Resolves to the new comment, in the same shape.
export function addComment(reviewId, text) {
  return api(`/reviews/${encodeURIComponent(reviewId)}/comments`, {
    method: 'POST',
    body: { text },
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
