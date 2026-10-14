// One definition of "this member wants to see this film", used everywhere.
// A film is wanted if they haven't seen it, or they have and flagged a rewatch.
export function isWanted(entry) {
  return entry.status === 'plan_to_watch' || entry.wantsRewatch === true
}

export function getUserWatchlist(filmList, userId) {
  return filmList.filter((entry) => entry.userId === userId && isWanted(entry))
}

export function getMembersWanting(filmList, tmdbId, excludeUserId = null) {
  return filmList.filter(
    (entry) =>
      entry.tmdbId === tmdbId &&
      entry.userId !== excludeUserId &&
      isWanted(entry)
  )
}

export function describeOthersWanting(count) {
  if (count === 0) return 'No one else has this on their list yet'
  if (count === 1) return '1 other member wants to see this'
  return `${count} other members want to see this`
}

// The films the most members want to see. First-time watches and rewatches
// count the same, because isWanted() already treats them as one question.
export function getMostWanted(filmList, limit = 10) {
  const byFilm = new Map()

  filmList.filter(isWanted).forEach((entry) => {
    const existing = byFilm.get(entry.tmdbId)

    if (existing) {
      existing.count += 1
      return
    }

    byFilm.set(entry.tmdbId, {
      tmdbId: entry.tmdbId,
      title: entry.title,
      year: entry.year,
      posterPath: entry.posterPath,
      count: 1,
    })
  })

  return [...byFilm.values()]
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, limit)
}