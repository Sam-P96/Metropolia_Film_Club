import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { getFilm } from '../services/tmdb'
import { getMyFilm, saveReview } from '../services/films'
import useApi from '../hooks/useApi'
import RatingInput from '../components/reviews/RatingInput'

const MAX_LENGTH = 4000

// Loads what's needed to pre-fill the form, then hands over to it. The form
// can't start from data that hasn't arrived yet, so it waits here. "Edit
// review" on a review's page sends `fromReview` (its id), so the form goes
// back there instead of to the film.
function WriteReview() {
  const { tmdbId } = useParams()
  const id = Number(tmdbId)
  const fromReview = useLocation().state?.fromReview ?? null

  const { data: film } = useApi(() => getFilm(id), [id])
  const mine = useApi(() => getMyFilm(id), [id])

  if (mine.loading) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        Loading…
      </section>
    )
  }

  if (mine.error) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        {mine.error.message}
      </section>
    )
  }

  // Keyed by film, so moving to another film's review page starts fresh.
  return (
    <ReviewForm
      key={id}
      id={id}
      film={film}
      myEntry={mine.data.entry}
      existingReview={mine.data.review}
      fromReview={mine.data.review && mine.data.review._id === fromReview ? fromReview : null}
    />
  )
}

function ReviewForm({ id, film, myEntry, existingReview, fromReview }) {
  const navigate = useNavigate()

  // Two separate records. The entry holds the rating, the review holds the
  // text. A member can have the first without the second.
  const hadRating = myEntry?.rating != null
  const isUpdate = existingReview !== null || hadRating

  // Pre-fill. The rating comes from the entry, falling back to the review's
  // copy of it, because a rating can exist with no review at all.
  const [rating, setRating] = useState(
    myEntry?.rating ?? existingReview?.rating ?? 0
  )
  const [text, setText] = useState(existingReview?.text ?? '')
  const [containsSpoilers, setContainsSpoilers] = useState(
    existingReview?.containsSpoilers ?? false
  )

  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Derived once, used by the hint, the button label and the submit.
  const trimmed = text.trim()
  const hasText = trimmed.length > 0
  const ratingValue = rating === 0 ? null : rating

  // Neither left: on a film they'd already rated or reviewed, saving takes
  // both off (the film stays on their list as watched).
  const removingAll = isUpdate && ratingValue === null && !hasText

  // Where saving and "Back" go: the review's page if they came from it and
  // it's still there, otherwise the film, where the review (or the new club
  // rating) shows up.
  const backTo = fromReview ? `/reviews/${fromReview}` : `/films/${id}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (ratingValue === null && !hasText && !isUpdate) {
      setError('Give it a rating, write something, or both.')
      return
    }

    // One request, one payload. `text: null` is the signal that there is no
    // written review — the server saves the rating on the film list entry and
    // deletes any review that was there before.
    const payload = {
      rating: ratingValue,
      text: hasText ? trimmed : null,
      containsSpoilers: hasText ? containsSpoilers : false,
    }

    setSaving(true)

    try {
      const { review } = await saveReview(id, payload)
      if (fromReview && review) navigate(backTo, { replace: true })
      else navigate(`/films/${id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const [headingLead, headingAccent] = existingReview
    ? ['Edit your ', 'review']
    : myEntry?.rating != null
      ? ['Update your ', 'rating']
      : ['Write a ', 'review']

  const submitLabel = removingAll
    ? existingReview && hadRating
      ? 'Remove review and rating'
      : existingReview
        ? 'Remove review'
        : 'Remove rating'
    : isUpdate
      ? 'Save changes'
      : hasText
        ? 'Post review'
        : 'Save rating'

  const inputClasses =
    'w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'

  const labelClasses = 'mb-2 block text-sm font-medium text-white/70'

  return (
    <section className="px-8 py-16 text-white">
      <div className="mx-auto max-w-2xl">

        <Link
          to={backTo}
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          {fromReview ? '← Back to the review' : '← Back to the film'}
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          {headingLead}
          <span className="text-brand-gold">{headingAccent}</span>
        </h1>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        {film && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-ink/60 p-4 backdrop-blur-xl">
            {film.posterPath && (
              <img
                src={`https://image.tmdb.org/t/p/w154${film.posterPath}`}
                alt=""
                className="w-16 self-start rounded-md"
              />
            )}
            <div>
              <p className="font-medium">{film.title}</p>
              {film.year && (
                <p className="text-sm text-white/50">{film.year}</p>
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
            <label htmlFor="text" className={labelClasses}>
              Your review{' '}
              <span className="font-normal text-white/40">(optional)</span>
            </label>
            <textarea
              id="text"
              rows={10}
              maxLength={MAX_LENGTH}
              placeholder="What did you think? Leave this empty to log a rating only."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`${inputClasses} resize-y`}
            />
            <p className="mt-2 text-right text-xs text-white/40">
              {text.length} / {MAX_LENGTH}
            </p>
          </div>

          <label
            className={`flex items-center gap-3 text-sm ${
              hasText ? 'text-white/70' : 'cursor-not-allowed text-white/30'
            }`}
          >
            <input
              type="checkbox"
              disabled={!hasText}
              checked={hasText && containsSpoilers}
              onChange={(e) => setContainsSpoilers(e.target.checked)}
              className="h-4 w-4 accent-brand-red"
            />
            This review contains spoilers
          </label>

          {/* Tells the member what the empty textarea, or the empty stars,
              actually mean. */}
          {!hasText && ratingValue !== null && (
            <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              {existingReview
                ? 'Clearing the text removes your written review. Your rating stays on the film and still counts towards the club average.'
                : 'Rating only. This goes on your film list and counts towards the club average, but it will not appear as a review anywhere.'}
            </p>
          )}

          {hasText && ratingValue === null && hadRating && (
            <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              Saving removes your rating, so it no longer counts towards the club average. Your review stays,
              unrated.
            </p>
          )}

          {removingAll && (
            <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white/80">
              {existingReview && hadRating
                ? 'No rating and no review: saving removes both, and the comments on your review go with it.'
                : existingReview
                  ? 'No review left: saving removes it, and its comments go with it.'
                  : 'No rating left: saving removes it, so it no longer counts towards the club average.'}{' '}
              The film stays on your list as watched.
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              disabled={saving}
              className="rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? 'Saving…' : submitLabel}
            </button>

            <Link
              to={backTo}
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

        </form>
      </div>
    </section>
  )
}

export default WriteReview