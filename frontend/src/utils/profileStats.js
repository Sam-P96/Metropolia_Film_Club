export function getProfileStats(reviews) {
  const rated = reviews.filter((review) => review.rating != null)

  const averageRating = rated.length
    ? rated.reduce((sum, review) => sum + review.rating, 0) / rated.length
    : null

  const genreCounts = {}

  reviews.forEach((review) => {
    (review.genres || []).forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    })
  })

  const ranked = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])

  return {
    reviewCount: reviews.length,
    averageRating,
    topGenre: ranked.length ? ranked[0][0] : null,
  }
}