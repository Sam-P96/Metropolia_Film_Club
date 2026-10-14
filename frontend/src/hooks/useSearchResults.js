import { useEffect, useState } from 'react'

import events from '../data/events'
import users from '../data/users'
import { searchFilms } from '../services/tmdb'
import { getPastEvents, getUpcomingEvents } from '../utils/eventDates'
import { searchEvents, searchUsers } from '../utils/search'

// The backend's film search returns nothing for one letter, so don't ask.
export const MIN_FILM_QUERY = 2

// Everything the nav dropdown and the /search page show for one query.
// delayMs debounces the film request: the dropdown passes a delay so TMDB
// isn't hit on every keystroke; the page only changes query on submit.
function useSearchResults(query, delayMs = 0) {
  const trimmed = query.trim()

  // Remembers which query these films are for, so "still loading" is just
  // "the last answer was for a different query" — no extra state to sync.
  const [filmResults, setFilmResults] = useState({
    query: '',
    films: [],
    total: 0,
    error: false,
  })

  useEffect(() => {
    if (trimmed.length < MIN_FILM_QUERY) return

    let cancelled = false

    const timer = setTimeout(() => {
      searchFilms(trimmed)
        .then((data) => {
          if (cancelled) return
          setFilmResults({
            query: trimmed,
            films: data.films ?? [],
            total: data.totalResults ?? 0,
            error: false,
          })
        })
        .catch(() => {
          if (cancelled) return
          setFilmResults({ query: trimmed, films: [], total: 0, error: true })
        })
    }, delayMs)

    // A slow answer for "per" must not overwrite the one for "perfect blue".
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed, delayMs])

  const tooShort = trimmed.length < MIN_FILM_QUERY
  const ready = !tooShort && filmResults.query === trimmed

  return {
    query: trimmed,
    upcoming: trimmed ? searchEvents(getUpcomingEvents(events), trimmed) : [],
    past: trimmed ? searchEvents(getPastEvents(events), trimmed) : [],
    members: trimmed ? searchUsers(users, trimmed) : [],
    films: {
      tooShort,
      loading: !tooShort && !ready,
      error: ready && filmResults.error,
      list: ready ? filmResults.films : [],
      total: ready ? filmResults.total : 0,
    },
  }
}

// One message for the films section in every state but "here are films".
export function filmsStatusText(films) {
  if (films.tooShort) return 'Keep typing to search films...'
  if (films.loading) return 'Searching...'
  if (films.error) return "Couldn't reach the film search."
  return 'No films match.'
}

export default useSearchResults
