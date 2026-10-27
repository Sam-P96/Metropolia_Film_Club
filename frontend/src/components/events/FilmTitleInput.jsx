import { useEffect, useState } from 'react'
import { searchFilms } from '../../services/tmdb'

// The backend's film search returns nothing for one letter, so don't ask.
const MIN_QUERY = 2
const MAX_SUGGESTIONS = 6

// The event form's Film box. Typing suggests films from TMDB, and picking one
// hands the film to `onPick`, which fills in the title and TMDB id. The text
// stays free, so a film TMDB doesn't have can still be named.
function FilmTitleInput({ id, value, onChange, onPick, className }) {
  // Only open after typing, so opening the edit form doesn't search for the
  // title that's already there.
  const [open, setOpen] = useState(false)
  const trimmed = value.trim()

  // Remembers which query these results are for, so "still searching" is
  // just "the last answer was for a different query".
  const [found, setFound] = useState({ query: '', films: [], error: false })

  useEffect(() => {
    if (!open || trimmed.length < MIN_QUERY) return

    let cancelled = false

    // Wait for a pause in typing before asking TMDB.
    const timer = setTimeout(() => {
      searchFilms(trimmed)
        .then((data) => {
          if (!cancelled) setFound({ query: trimmed, films: data.films ?? [], error: false })
        })
        .catch(() => {
          if (!cancelled) setFound({ query: trimmed, films: [], error: true })
        })
    }, 400)

    // A slow answer for "per" must not replace the one for "perfect blue".
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, trimmed])

  const showList = open && trimmed.length >= MIN_QUERY
  const searching = found.query !== trimmed
  const films = searching ? [] : found.films.slice(0, MAX_SUGGESTIONS)

  const pick = (film) => {
    onPick(film)
    setOpen(false)
  }

  return (
    <div
      className="relative"
      // Close when focus leaves the box and its list, not when it moves
      // from one to the other.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        autoComplete="off"
        aria-expanded={showList}
        placeholder="Start typing to search TMDB"
        className={className}
      />

      {showList && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-white/10 bg-ink shadow-xl shadow-black/50">
          {searching ? (
            <p className="px-4 py-3 text-sm text-white/40">Searching…</p>
          ) : films.length === 0 ? (
            <p className="px-4 py-3 text-sm text-white/40">
              {found.error
                ? "Couldn't reach the film search. You can still type the title."
                : 'No films match. You can still use this title.'}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {films.map((film) => (
                <li key={film.tmdbId}>
                  <button
                    type="button"
                    // Keeps focus in the box, so the list doesn't close
                    // before the click lands (Safari doesn't focus buttons).
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(film)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                  >
                    <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-white/5">
                      {film.posterPath && (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{film.title}</p>
                      <p className="text-xs text-white/40">
                        {film.year || 'Unknown year'} · TMDB {film.tmdbId}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default FilmTitleInput
