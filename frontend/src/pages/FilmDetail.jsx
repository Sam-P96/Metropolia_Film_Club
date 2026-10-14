import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import users from '../data/users'
import reviews from '../data/reviews'
import filmList from '../data/filmList'
import { getFilm } from '../services/tmdb'
import ReviewCard from '../components/reviews/ReviewCard'
import StarRating from '../components/reviews/StarRating'
import { getClubRating } from '../utils/clubFilmStats'
import { getMembersWanting, isWanted } from '../utils/watchlist'
import { getCurrentUser } from '../utils/currentUser'
import { resolveMemberId, getUserReviewForFilm } from '../utils/reviewLookup'
import { getUserFilmEntry } from '../utils/filmListLookup'

const REVIEWS_PER_PAGE = 4

function FilmDetail({ isAuthenticated }) {
  // The route is /films/:tmdbId, so that is the name useParams gives back.
  // It always arrives as a string, and the data files store numbers.
  const { tmdbId } = useParams()
  const id = Number(tmdbId)

  const [film, setFilm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE)

  const [currentUser] = useState(getCurrentUser)

  const memberId = resolveMemberId(users, currentUser)
  const me = users.find((user) => user._id === memberId) ?? null

  const myEntry = getUserFilmEntry(filmList, memberId, id)
  const myReview = getUserReviewForFilm(reviews, memberId, id)

  // "Has seen it" — any of the three counts. This is what turns
  // "Plan to watch" into "Plan to rewatch".
  const hasWatched =
    myReview !== null ||
    myEntry?.rating != null ||
    myEntry?.status === 'completed'

  // Local until the backend exists. Starts from whatever the data file says.
  const [planned, setPlanned] = useState(false)

  useEffect(() => {
    const entry = getUserFilmEntry(filmList, memberId, id)
    setPlanned(entry ? isWanted(entry) : false)
  }, [id, memberId])

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)
    setVisibleCount(REVIEWS_PER_PAGE)

    getFilm(id)
      .then((data) => {
        if (!cancelled) setFilm(data)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this film.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // If you click through to another film before this finishes, the old
    // response must not overwrite the new one.
    return () => {
      cancelled = true
    }
  }, [id])

  const handlePlanToggle = () => {
    const next = !planned
    setPlanned(next)

    // Three different writes, because the meaning of the click depends on
    // whether they've already seen the film.
    if (hasWatched) {
      // Seen it — only the rewatch flag changes, the entry stays 'completed'.
      console.log('PATCH', `/api/films/${id}/log`, { wantsRewatch: next })
    } else if (next) {
      console.log('PUT', `/api/films/${id}/log`, { status: 'plan_to_watch' })
    } else {
      // Never watched and no longer planned — nothing left to keep.
      console.log('DELETE', `/api/films/${id}/log`)
    }
  }

  const club = getClubRating(filmList, id)

  // Everyone except me, straight from the data file...
  const others = getMembersWanting(filmList, id)
    .map((entry) => ({
      entry,
      user: users.find((user) => user._id === entry.userId),
    }))
    .filter(({ entry, user }) => user && entry.userId !== memberId)

  // ...then me, from local state, so the list reacts to the button instantly.
  const youRow =
    planned && me
      ? {
          entry: {
            _id: 'you',
            userId: memberId,
            status: hasWatched ? 'completed' : 'plan_to_watch',
            wantsRewatch: hasWatched,
          },
          user: me,
        }
      : null

  const wanting = youRow ? [youRow, ...others] : others

  const filmReviews = reviews
    .filter((review) => review.tmdbId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((review) => ({
      ...review,
      user: users.find((user) => user._id === review.userId),
    }))
    .filter((review) => review.user)

  const visibleReviews = filmReviews.slice(0, visibleCount)
  const remaining = filmReviews.length - visibleReviews.length

  if (loading) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        Loading…
      </section>
    )
  }

  if (error || !film) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        {error ?? 'Film not found.'}
      </section>
    )
  }

  const planLabel = hasWatched ? 'Plan to rewatch' : 'Plan to watch'

  // Filled gold when it's on your list, outlined when it isn't.
  const planClasses = planned
    ? 'rounded-md bg-brand-gold px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-brand-gold/85'
    : 'rounded-md border border-brand-gold/60 px-5 py-2.5 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10'

  return (
    <section className="text-white">

      {/* backdrop, fading into the page background */}
      {film.backdropPath && (
        <div className="relative z-0 h-[40vh] w-full overflow-hidden">
          <img
            src={`https://image.tmdb.org/t/p/w1280${film.backdropPath}`}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-ink/40 to-ink" />
        </div>
      )}

      {/* relative + z-10 so this paints ABOVE the positioned backdrop above.
          Without it the backdrop covers the poster and title. */}
      <div className="relative z-10 mx-auto max-w-5xl px-8 pb-24">
        <div
          className={`flex flex-col gap-8 sm:flex-row ${
            film.backdropPath ? '-mt-32' : 'pt-16'
          }`}
        >
          {film.posterPath && (
            <img
              src={`https://image.tmdb.org/t/p/w342${film.posterPath}`}
              alt={film.title}
              className="w-48 shrink-0 self-start rounded-xl border border-white/10 shadow-xl shadow-black/50"
            />
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-bold">
              {film.title}{' '}
              {film.year && (
                <span className="font-normal text-white/40">({film.year})</span>
              )}
            </h1>

            {film.tagline && (
              <p className="mt-2 text-sm text-brand-gold italic">
                {film.tagline}
              </p>
            )}

            <p className="mt-3 text-sm text-white/50">
              {[
                film.runtime ? `${film.runtime} min` : null,
                film.genres?.length ? film.genres.join(', ') : null,
                film.studios?.length ? film.studios[0] : null,
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </p>

            {film.overview && (
              <p className="mt-6 leading-relaxed text-white/80">
                {film.overview}
              </p>
            )}

            {/* ratings on the left, the two actions pushed to the right */}
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <div>
                <p className="text-xs tracking-wider text-white/40 uppercase">
                  Club rating
                </p>
                <div className="mt-1">
                  <StarRating rating={club.average} size="md" />
                </div>
                {club.count > 0 && (
                  <p className="mt-1 text-xs text-white/40">
                    {club.average.toFixed(1)} from {club.count}{' '}
                    {club.count === 1 ? 'member' : 'members'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs tracking-wider text-white/40 uppercase">
                  TMDB
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {film.tmdbRating ? film.tmdbRating.toFixed(1) : '—'}
                  <span className="ml-2 text-sm font-normal text-white/40">
                    / 10
                  </span>
                </p>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-3">
                {/* Logged out: both buttons go and log you in first, then
                    Login sends you on to where you were headed. */}
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handlePlanToggle}
                    aria-pressed={planned}
                    className={planClasses}
                  >
                    {planned ? `✓ ${planLabel}` : planLabel}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    state={{ from: `/films/${id}` }}
                    className={planClasses}
                  >
                    {planLabel}
                  </Link>
                )}

                <Link
                  to={isAuthenticated ? `/films/${id}/review` : '/login'}
                  state={isAuthenticated ? null : { from: `/films/${id}/review` }}
                  className="rounded-md bg-brand-red px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-orange"
                >
                  {myReview ? 'Edit your review' : 'Write a review'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* who wants to see this */}
        <div className="mt-16">
          <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Who wants to see this
          </h2>

          {wanting.length === 0 ? (
            <p className="text-sm text-white/40">
              Nobody has this on their list right now.
            </p>
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              {wanting.map(({ entry, user }) => {
                const isRewatch = entry.status === 'completed'
                const isYou = entry.userId === memberId

                return (
                  <li key={entry._id}>
                    <Link
                      to={`/users/${user._id}`}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/20"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-red text-sm font-bold ring-2 ring-white/20">
                          {user.username[0].toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium transition-colors group-hover:text-brand-gold">
                          {user.username}
                          {isYou && (
                            <span className="ml-2 text-xs font-normal text-white/40">
                              you
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-white/40">
                          {user.memberTitle}
                        </p>
                      </div>

                      <span
                        className={
                          isRewatch
                            ? 'shrink-0 rounded border border-brand-orange/50 px-2 py-0.5 text-[10px] tracking-wide text-brand-orange uppercase'
                            : 'shrink-0 rounded border border-brand-gold/50 px-2 py-0.5 text-[10px] tracking-wide text-brand-gold uppercase'
                        }
                      >
                        {isRewatch ? 'Rewatch' : 'Watch'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* club reviews */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold">
            Club <span className="text-brand-gold">reviews</span>
            <span className="ml-3 text-base font-normal text-white/40">
              {filmReviews.length}
            </span>
          </h2>

          <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

          {filmReviews.length === 0 ? (
            <p className="text-white/50">
              Nobody has reviewed this one yet. Be the first.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {visibleReviews.map((review) => (
                  <ReviewCard key={review._id} review={review} />
                ))}
              </div>

              {remaining > 0 && (
                <button
                  onClick={() =>
                    setVisibleCount((count) => count + REVIEWS_PER_PAGE)
                  }
                  className="mt-8 rounded-md border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Load {Math.min(remaining, REVIEWS_PER_PAGE)} more
                  {remaining > REVIEWS_PER_PAGE && ` of ${remaining}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default FilmDetail