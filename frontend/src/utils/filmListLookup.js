// A member's log entry for one film. This is where the rating lives.
// A member can have an entry with a rating and no review, which is the
// whole point: rating and review are separate records.
export function getUserFilmEntry(filmList, memberId, tmdbId) {
  if (!memberId) return null

  const id = Number(tmdbId)

  const found = filmList.find(
    (entry) => entry.userId === memberId && entry.tmdbId === id
  )

  return found ?? null
}