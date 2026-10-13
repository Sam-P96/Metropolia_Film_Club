import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getFilm } from '../services/tmdb'
import { reviews } from '../data/reviews'
import ReviewCard from '../components/reviews/ReviewCard'
import { getClubRating } from '../utils/clubFilmStats'
import { getMembersWanting, describeOthersWanting } from '../utils/watchlist'
import { getCurrentUser } from '../utils/currentUser'
import { getUserReviewForFilm } from '../utils/reviewLookup'

const REVIEWS_PER_PAGE = 6

function FilmDetail({ isAuthenticated }) {
  const { id } = useParams()

  const [film, setFilm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE)

  const [currentUser] = useState(getCurrentUser)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    getFilm(id)
      .then((data) => {
        if (cancelled) return
        setFilm(data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError("Couldn't load this film.")
        setLoading(false)
      })

    // If the user clicks through to another film before this finishes,
    // the old response must not overwrite the new one.
    return () => {
      cancelled = true
    }
  }, [id])

  // Reset the load-more counter when the film changes.
  useEffect(() => {
    setVisibleCount(REVIEWS_PER_PAGE)
  }, [id])

  const filmReviews = useMemo(
    () =>
      reviews
        .filter((review) => review.tmdbId === Number(id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [id]
  )

  const visibleReviews = filmReviews.slice(0, visibleCount)
  const remaining = filmReviews.length - visibleReviews.length

  // Has this member already reviewed this film?
  const myReview = useMemo(
    () => getUserReviewForFilm(reviews, currentUser?._id, id),
    [currentUser, id]
  )

  const clubRating = getClubRating(Number(id))
  const membersWanting = getMembersWanting(Number(id))

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

  return (
    <section className="text-white">

      {/* backdrop, fading into the page background */}
      {film.backdropPath && (
        <div className="relative h-[40vh] w-full overflow-hidden">
          <img
            src={`https://image.tmdb.org/t/p/w1280${film.backdropPath}`}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-ink/40 to-ink" />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-8 pb-24">
        <div className={`flex flex-col gap-8 sm:flex-row ${film.backdropPath ? '-mt-32' : 'pt-16'}`}>

          {film.posterPath && (
            <img
              src={`https://image.tmdb.org/t/p/w342${film.posterPath}`}
              alt={film.title}
              className="w-48 shrink-0 rounded-xl border border-white/10 shadow-xl shadow-black/50"
            />
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-bold">{film.title}</h1>

            <p className="mt-3 text-sm text-white/50">
              {[
                film.releaseDate?.slice(0, 4),
                film.runtime ? `${film.runtime} min` : null,
                film.genres?.map((genre) => genre.name).join(', '),
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </p>

            {film.overview && (
              <p className="mt-6 leading-relaxed text-white/80">
                {film.overview}
              </p>
            )}

            {/* ratings on the left, the review button pushed to the right */}
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40">
                  Club rating
                </p>
                {clubRating?.count ? (
                  <p className="mt-1 text-2xl font-bold text-brand-gold">
                    {clubRating.average.toFixed(1)}
                    <span className="ml-2 text-sm font-normal text-white/40">
                      / 5 · {clubRating.count}{' '}
                      {clubRating.count === 1 ? 'rating' : 'ratings'}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-white/40">Not rated yet</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-white/40">
                  TMDB
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {film.voteAverage ? film.voteAverage.toFixed(1) : '—'}
                  <span className="ml-2 text-sm font-normal text-white/40">
                    / 10
                  </span>
                </p>
              </div>

              <Link
                to={isAuthenticated ? `/films/${id}/review` : '/'}
                className="ml-auto rounded-md bg-brand-red px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-orange"
              >
                {myReview ? 'Edit your review' : 'Write a review'}
              </Link>
            </div>
          </div>
        </div>

        {/* who wants to see this */}
        {membersWanting?.length > 0 && (
          <div className="mt-16 rounded-2xl border border-white/10 bg-ink/60 p-6 backdrop-blur-xl">
            <h2 className="text-sm font-medium uppercase tracking-wider text-white/40">
              Plan to watch / rewatch
            </h2>
            <p className="mt-3 text-white/80">
              {describeOthersWanting(membersWanting)}
            </p>
          </div>
        )}

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
              <div className="space-y-6">
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