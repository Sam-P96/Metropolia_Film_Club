import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getFilm } from '../services/tmdb'
import { reviews } from '../data/reviews'
import RatingInput from '../components/reviews/RatingInput'
import { getCurrentUser } from '../utils/currentUser'
import { getUserReviewForFilm } from '../utils/reviewLookup'

const MAX_LENGTH = 4000

function WriteReview() {
  const { id } = useParams()

  // Lazy initialiser: the function runs once on mount, not on every render.
  const [currentUser] = useState(getCurrentUser)

  // This member's existing review for this film, or null if they
  // haven't written one yet. This one value decides everything below:
  // the heading, the button text, and whether we POST or PATCH.
  const existingReview = useMemo(
    () => getUserReviewForFilm(reviews, currentUser?._id, id),
    [currentUser, id]
  )

  const isEditing = existingReview !== null

  // Pre-fill the form from the existing review when there is one.
  // useState's initial value is only read on the first render, which is
  // fine while reviews come from a local file (the lookup is instant).
  // Once this is a fetch, these three will need a useEffect to sync.
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [body, setBody] = useState(existingReview?.body ?? '')
  const [containsSpoilers, setContainsSpoilers] = useState(
    existingReview?.containsSpoilers ?? false
  )

  const [film, setFilm] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    getFilm(id)
      .then((data) => {
        if (!cancelled) setFilm(data)
      })
      .catch(() => {
        if (!cancelled) setFilm(null)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (rating === 0 && body.trim() === '') {
      setError('Give it a rating, write something, or both.')
      return
    }

    const payload = {
      tmdbId: Number(id),
      rating,
      body: body.trim(),
      containsSpoilers,
    }

    if (isEditing) {
      // PATCH /api/reviews/:reviewId
      console.log('UPDATE', existingReview._id, payload)
    } else {
      // POST /api/reviews
      console.log('CREATE', payload)
    }

    setSaved(true)
  }

  const inputClasses =
    'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'

  const labelClasses = 'mb-2 block text-sm font-medium text-white/70'

  return (
    <section className="px-8 py-16 text-white">
      <div className="mx-auto max-w-2xl">

        <Link
          to={`/films/${id}`}
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Back to film
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          {isEditing ? 'Edit your ' : 'Write a '}
          <span className="text-brand-gold">review</span>
        </h1>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        {film && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-ink/60 p-4 backdrop-blur-xl">
            {film.posterPath && (
              <img
                src={`https://image.tmdb.org/t/p/w154${film.posterPath}`}
                alt=""
                className="w-16 rounded-md"
              />
            )}
            <div>
              <p className="font-medium">{film.title}</p>
              {film.releaseDate && (
                <p className="text-sm text-white/50">
                  {film.releaseDate.slice(0, 4)}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <span className={labelClasses}>Your rating</span>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          <div>
            <label htmlFor="body" className={labelClasses}>
              Your review
            </label>
            <textarea
              id="body"
              rows={10}
              maxLength={MAX_LENGTH}
              placeholder="What did you think?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${inputClasses} resize-y`}
            />
            <p className="mt-2 text-right text-xs text-white/40">
              {body.length} / {MAX_LENGTH}
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={containsSpoilers}
              onChange={(e) => setContainsSpoilers(e.target.checked)}
              className="h-4 w-4 accent-brand-red"
            />
            This review contains spoilers
          </label>

          <div className="flex items-center gap-4">
            <button className="rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange">
              {isEditing ? 'Save changes' : 'Post review'}
            </button>

            <Link
              to={`/films/${id}`}
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Cancel
            </Link>
          </div>

          {error && (
            <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white">
              {error}
            </p>
          )}

          {saved && (
            <p className="rounded-md border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-white">
              {isEditing ? 'Changes' : 'Review'} not saved — the backend isn't
              built yet. Check the console to see what would have been sent.
            </p>
          )}

        </form>
      </div>
    </section>
  )
}

export default WriteReview