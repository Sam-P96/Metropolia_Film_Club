// A member gets one review per film. That single rule is what lets
// "write a review" and "edit my review" be the same page and the same URL.

// The placeholder data in data/users.js uses ids like 'u1'. A real account
// from the backend has a Mongo _id that will never match one of those, so
// while reviews still come from the data file we match on username instead
// and translate it into a placeholder id. Delete this function once reviews
// come from the API and carry real userIds.
export function resolveMemberId(users, currentUser) {
  if (!currentUser) return null

  const placeholder = users.find(
    (user) => user.username === currentUser.username
  )

  return placeholder?._id ?? currentUser._id ?? null
}

export function getUserReviewForFilm(reviews, memberId, tmdbId) {
  if (!memberId) return null

  const id = Number(tmdbId)

  const found = reviews.find(
    (review) => review.userId === memberId && review.tmdbId === id
  )

  return found ?? null
}