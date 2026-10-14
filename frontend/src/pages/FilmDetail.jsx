import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getFilm } from '../services/tmdb'
import { getFilmClub, getFilmReviews, getMyFilm, setPlanned } from '../services/films'
import useApi from '../hooks/useApi'
import ReviewCard from '../components/reviews/ReviewCard'
import StarRating from '../components/reviews/StarRating'
import { isWanted } from '../utils/watchlist'
import { getCurrentUser } from '../utils/currentUser'

const REVIEWS_PER_PAGE = 4

function FilmDetail({ isAuthenticated }) {
  // The route is /films/:tmdbId, so that is the name useParams gives back.
  // It always arrives as a string, and the API stores numbers.
  const { tmdbId } = useParams()
  const id = Number(tmdbId)

  const [currentUser] = useState(getCurrentUser)
  const myId = currentUser?._id ?? null

  // TMDB's side of the film, the club's side, and the logged-in member's own
  // entry and review. Each refetches when you click through to another film.
  const filmResult = useApi(() => getFilm(id), [id])
  const club = useApi(() => getFilmClub(id), [id])
  const reviews = useApi(() => getFilmReviews(id), [id])
  const mine = useApi(() => getMyFilm(id), [id], { enabled: Boolean(isAuthenticated) })

  const film = filmResult.data
  const myEntry = mine.data?.entry ?? null
  const myReview = mine.data?.review ?? null

  // "Has seen it" — any of the three counts. This is what turns
  // "Plan to watch" into "Plan to rewatch".
  const hasWatched =
    myReview !== null ||
    myEntry?.rating != null ||
    myEntry?.status === 'completed'

  const planned = myEntry ? isWanted(myEntry) : false

  const [savingPlan, setSavingPlan] = useState(false)
  const [planError, setPlanError] = useState(null)

  // Tied to the film it was for, so clicking through to another film starts
  // back at the first page of reviews without an effect to reset it.
  const [shown, setShown] = useState({ id, count: REVIEWS_PER_PAGE })
  const visibleCount = shown.id === id ? shown.count : REVIEWS_PER_PAGE

  // The server works out what the click means (add, rewatch, or remove),
  // because that depends on whether they've already seen the film.
  const handlePlanToggle = async () => {
    setSavingPlan(true)
    setPlanError(null)

    try {
      const { entry } = await setPlanned(id, !planned)
      mine.setData((previous) => ({ ...previous, entry }))
      club.reload() // "who wants to see this" just changed
    } catch (err) {
      setPlanError(err.message)
    } finally {
      setSavingPlan(false)
    }
  }

  const clubRating = club.data?.rating ?? { average: null, count: 0 }

  // TMDB scores out of 10. Halved (to one decimal) it sits on the same five
  // stars as the club rating, so the two can be compared at a glance.
  // A film with no votes has a score of 0, which means "not rated".
  const tmdbOutOfFive = film?.tmdbRating ? Math.round(film.tmdbRating * 5) / 10 : null
  const wanting = club.data?.wanting ?? []
  const filmReviews = reviews.data ?? []

  const visibleReviews = filmReviews.slice(0, visibleCount)
  const remaining = filmReviews.length - visibleReviews.length

  if (filmResult.loading) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        Loading…
      </section>
    )
  }

  if (!film) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        {filmResult.error ? "Couldn't load this film." : 'Film not found.'}
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
              {/* self-start: the two ratings line up by their labels even
                  when one says "Not rated" and is shorter than the other */}
              <div className="self-start">
                <p className="text-xs tracking-wider text-white/40 uppercase">
                  Club rating
                </p>
                <div className="mt-1">
                  <StarRating rating={clubRating.average} size="md" />
                </div>
                {clubRating.count > 0 && (
                  <p className="mt-1 text-xs text-white/40">
                    {clubRating.average.toFixed(1)} from {clubRating.count}{' '}
                    {clubRating.count === 1 ? 'member' : 'members'}
                  </p>
                )}
              </div>

              <div className="self-start">
                <p className="text-xs tracking-wider text-white/40 uppercase">
                  TMDB
                </p>
                <div className="mt-1">
                  <StarRating rating={tmdbOutOfFive} size="md" />
                </div>
                {tmdbOutOfFive != null && (
                  <p className="mt-1 text-xs text-white/40">
                    {tmdbOutOfFive.toFixed(1)}
                    {film.tmdbVotes > 0 &&
                      ` from ${film.tmdbVotes.toLocaleString('en-GB')} ${
                        film.tmdbVotes === 1 ? 'vote' : 'votes'
                      }`}
                  </p>
                )}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-3">
                {/* Logged out: both buttons go and log you in first, then
                    Login sends you on to where you were headed. */}
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handlePlanToggle}
                    aria-pressed={planned}
                    disabled={savingPlan || mine.loading}
                    className={`${planClasses} disabled:cursor-wait disabled:opacity-60`}
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

        {planError && (
          <p className="mt-4 rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white">
            {planError}
          </p>
        )}

        {/* who wants to see this */}
        <div className="mt-16">
          <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Who wants to see this
          </h2>

          {wanting.length === 0 ? (
            <p className="text-sm text-white/40">
              {club.loading ? 'Loading…' : 'Nobody has this on their list right now.'}
            </p>
          ) : (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              {wanting.map((entry) => {
                const { user } = entry
                const isRewatch = entry.status === 'completed'
                const isYou = entry.userId === myId

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
              {reviews.loading
                ? 'Loading reviews…'
                : 'Nobody has reviewed this one yet. Be the first.'}
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
                    setShown({ id, count: visibleCount + REVIEWS_PER_PAGE })
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