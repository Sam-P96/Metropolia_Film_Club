// A member gets one review per film. That single rule is what lets
// "write a review" and "edit my review" be the same page and the
// same URL — the page just checks whether a review already exists.

export function getUserReviewForFilm(reviews, userId, tmdbId) {
  if (!userId) return null

  const found = reviews.find(
    (review) => review.userId === userId && review.tmdbId === Number(tmdbId)
  )

  return found ?? null
}