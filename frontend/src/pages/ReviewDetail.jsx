import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getReview } from '../services/films'
import useApi from '../hooks/useApi'
import StarRating from '../components/reviews/StarRating'
import { timeAgo } from '../utils/timeAgo'

function formatFullDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Helsinki',
  })
}

function ReviewDetail() {
  const { reviewId } = useParams()
  const [showSpoilers, setShowSpoilers] = useState(false)

  const { data: review, loading, error } = useApi(() => getReview(reviewId), [reviewId])

  if (loading) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        Loading…
      </section>
    )
  }

  if (!review) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">
          {error?.status === 404 ? 'Review not found' : "Couldn't load this review"}
        </h1>
        <p className="mt-3 text-white/60">
          {error?.status === 404
            ? 'This review may have been deleted, or the link is wrong.'
            : 'Something went wrong on our end. Try refreshing the page.'}
        </p>
        <Link
          to="/"
          className="mt-6 inline-block text-sm font-medium text-brand-gold transition-colors hover:text-white"
        >
          ← Back to the homepage
        </Link>
      </section>
    )
  }

  // Attached by the server. Null if the member has since been deleted.
  const author = review.user

  const posterUrl = review.posterPath
    ? `https://image.tmdb.org/t/p/w342${review.posterPath}`
    : null

  const hidden = review.containsSpoilers && !showSpoilers

  return (
    <section className="text-white">
      <div className="mx-auto max-w-4xl px-8 py-20">

        <Link
          to={author ? `/users/${author._id}` : '/'}
          className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
        >
          ← {author ? `Back to ${author.username}` : 'Back to the homepage'}
        </Link>

        <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">

          <div className="w-40 shrink-0">
            <div className="aspect-2/3 overflow-hidden rounded-lg border border-white/10 bg-ink/60 shadow-xl shadow-black/40">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={review.filmTitle}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-white/40">
                  {review.filmTitle}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">
              <Link
                to={`/films/${review.tmdbId}`}
                className="transition-colors hover:text-brand-gold"
              >
                {review.filmTitle}
              </Link>{' '}
              {review.filmYear && (
                <span className="font-normal text-white/40">({review.filmYear})</span>
              )}
            </h1>

            {review.genres && review.genres.length > 0 && (
              <p className="mt-2 text-sm text-white/40">
                {review.genres.join(' · ')}
              </p>
            )}

            <div className="mt-4">
              <StarRating rating={review.rating} />
            </div>

            <p className="mt-3 text-sm text-white/40">
              Reviewed {formatFullDate(review.createdAt)} · {timeAgo(review.createdAt)}
            </p>
          </div>

        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-plum/40 p-8 shadow-xl shadow-black/40 backdrop-blur-md">

          {review.containsSpoilers && (
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-md border border-brand-gold/40 bg-brand-gold/10 px-4 py-3">
              <p className="text-sm text-brand-gold">
                This review contains spoilers.
              </p>
              <button
                type="button"
                onClick={() => setShowSpoilers(!showSpoilers)}
                className="rounded-md border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
              >
                {showSpoilers ? 'Hide spoilers' : 'Show anyway'}
              </button>
            </div>
          )}

          {hidden ? (
            <p className="text-sm text-white/30">Review hidden.</p>
          ) : (
            <p className="leading-relaxed whitespace-pre-line text-white/80">
              {review.text}
            </p>
          )}

          <div className="mt-8 flex items-center gap-4 border-t border-white/10 pt-6">
            {author ? (
              <Link
                to={`/users/${author._id}`}
                className="group flex items-center gap-4"
              >
                {author.avatarUrl ? (
                  <img
                    src={author.avatarUrl}
                    alt={author.username}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red font-bold ring-2 ring-white/20">
                    {author.username[0].toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-semibold transition-colors group-hover:text-brand-gold">
                    {author.username}
                  </p>
                  <p className="text-sm text-white/50">{author.memberTitle}</p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-white/40">Unknown member</p>
            )}

            <p className="ml-auto text-sm text-white/40">♥ {review.likeCount}</p>
          </div>

        </div>

      </div>
    </section>
  )
}

export default ReviewDetail