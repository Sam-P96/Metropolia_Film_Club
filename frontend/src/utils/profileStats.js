// The numbers on a profile's Stats. Ratings and genres come from the
// member's film list (`films`), so a film they rated without writing a
// review counts too; until it has loaded (or if it can't), from their
// reviews, which carry a copy of the rating and the genres.
export function getProfileStats(reviews, films = null) {
  const watched = films ? films.filter((film) => film.status === 'completed') : reviews
  const ratings = watched.map((film) => film.rating).filter((rating) => rating != null)

  const averageRating = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : null

  const genres = genreCounts(watched)

  return {
    reviewCount: reviews.length,
    likesReceived: reviews.reduce((sum, review) => sum + (review.likeCount ?? 0), 0),
    averageRating,
    ratings,
    genres,
    topGenre: genres.length ? genres[0].genre : null,
  }
}

const WHOLE_STARS = [5, 4, 3, 2, 1]
const HALF_STARS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5]

// How many films were rated at each step, highest first:
// [{ stars, count }]. In whole stars each rating is rounded up, so 3.5
// counts as 4 and 0.5 as 1; `halves` counts each half star on its own.
export function ratingCounts(ratings, halves = false) {
  const steps = halves ? HALF_STARS : WHOLE_STARS
  const counts = new Map(steps.map((stars) => [stars, 0]))

  ratings.forEach((rating) => {
    const step = halves ? Math.ceil(rating * 2) / 2 : Math.ceil(rating)
    if (counts.has(step)) counts.set(step, counts.get(step) + 1)
  })

  return steps.map((stars) => ({ stars, count: counts.get(stars) }))
}

// Every genre of the films, most first, then A to Z: [{ genre, count }]. A
// film in two genres counts once towards each.
export function genreCounts(films) {
  const counts = new Map()

  films.forEach((film) => {
    new Set(film.genres ?? []).forEach((genre) => {
      counts.set(genre, (counts.get(genre) ?? 0) + 1)
    })
  })

  return [...counts]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
}

// The genre bars' colours, round the colour wheel from green, through blue
// and purple, to red for the last of `total` genres. Worked out over every
// genre, so the top five keep their colours when the list is expanded.
const GREEN_HUE = 145
const WHEEL_SPAN = 240

export function genreColour(index, total) {
  const along = total > 1 ? index / (total - 1) : 0
  return `oklch(0.72 0.16 ${(GREEN_HUE + WHEEL_SPAN * along) % 360})`
}
