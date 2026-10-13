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