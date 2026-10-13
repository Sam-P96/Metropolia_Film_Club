// How many members must have rated a film before it can appear in
// "top rated by the club". One 5-star rating is not a ranking.
export const MIN_RATINGS_FOR_RANKING = 2

export function getClubRating(filmList, tmdbId) {
  const rated = filmList.filter(
    (entry) => entry.tmdbId === tmdbId && entry.rating != null
  )

  if (rated.length === 0) {
    return { average: null, count: 0 }
  }

  const total = rated.reduce((sum, entry) => sum + entry.rating, 0)

  return { average: total / rated.length, count: rated.length }
}

export function getTopRatedFilms(filmList, limit = 6) {
  const byFilm = new Map()

  filmList.forEach((entry) => {
    if (entry.rating == null) return

    const existing = byFilm.get(entry.tmdbId)

    if (existing) {
      existing.ratings.push(entry.rating)
    } else {
      byFilm.set(entry.tmdbId, {
        tmdbId: entry.tmdbId,
        title: entry.title,
        year: entry.year,
        posterPath: entry.posterPath,
        ratings: [entry.rating],
      })
    }
  })

  return [...byFilm.values()]
    .filter((film) => film.ratings.length >= MIN_RATINGS_FOR_RANKING)
    .map((film) => ({
      tmdbId: film.tmdbId,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      count: film.ratings.length,
      average: film.ratings.reduce((sum, r) => sum + r, 0) / film.ratings.length,
    }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, limit)
}