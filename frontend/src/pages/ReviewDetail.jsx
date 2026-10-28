import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  deleteReview,
  getReview,
  reportReview,
  setReviewAllowComments,
  setReviewSpoilers,
  setReviewVote,
} from '../services/films'
import useApi from '../hooks/useApi'
import StarRating from '../components/reviews/StarRating'
import VoteButtons, { VoteBar } from '../components/reviews/VoteButtons'
import ReviewComments from '../components/reviews/ReviewComments'
import { timeAgo } from '../utils/timeAgo'
import { getCurrentUser } from '../utils/currentUser'
import { canDeleteAnyReview, canMarkSpoilers } from '../utils/permissions'

function formatFullDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Helsinki',
  })
}

function ReviewDetail({ isAuthenticated }) {
  const { reviewId } = useParams()
  const [showSpoilers, setShowSpoilers] = useState(false)
  const [currentUser] = useState(getCurrentUser)

  const { data: review, loading, error, setData } = useApi(() => getReview(reviewId), [reviewId])

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

  const isAuthor = Boolean(author) && author._id === currentUser?._id

  // Off on their profile hides comments under all the author's reviews; off
  // here hides them under this one. Either way nothing is deleted.
  const commentsEverywhere = author?.allowComments ?? true
  const commentsOpen = commentsEverywhere && review.allowComments

  return (
    <section className="text-white">
      <div className="mx-auto max-w-4xl px-8 py-20">

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to={author ? `/users/${author._id}` : '/'}
            className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
          >
            ← {author ? `Back to ${author.username}` : 'Back to the homepage'}
          </Link>

          <div className="flex flex-wrap items-start gap-3">
            {isAuthor && commentsEverywhere && (
              <SettingButton
                label={review.allowComments ? 'Turn off comments' : 'Turn on comments'}
                save={async () =>
                  (await setReviewAllowComments(review._id, !review.allowComments)).allowComments
                }
                onSaved={(allowComments) => setData((prev) => ({ ...prev, allowComments }))}
              />
            )}

            {canMarkSpoilers(currentUser) && (
              <SettingButton
                label={review.containsSpoilers ? 'Remove spoiler mark' : 'Mark as spoilers'}
                save={async () =>
                  (await setReviewSpoilers(review._id, !review.containsSpoilers)).containsSpoilers
                }
                onSaved={(containsSpoilers) => setData((prev) => ({ ...prev, containsSpoilers }))}
              />
            )}

            {currentUser && !isAuthor && <ReportReview review={review} />}

            {canDeleteAnyReview(currentUser) && !isAuthor && <DeleteReview review={review} />}
          </div>
        </div>

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

          {/* The share of likes to dislikes, as the divider above the votes.
              Dislikes count as 0 when the author has PVP off. */}
          <VoteBar
            likeCount={review.likeCount}
            dislikeCount={review.dislikeCount}
            allowDislikes={Boolean(author?.pvp)}
            className="mt-8"
          />

          <div className="flex flex-wrap items-center gap-4 pt-6">
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

            <div className="ml-auto">
              <VoteButtons
                likeCount={review.likeCount}
                dislikeCount={review.dislikeCount}
                myVote={review.myVote}
                send={(vote) => setReviewVote(review._id, vote)}
                onChange={(votes) => setData((prev) => ({ ...prev, ...votes }))}
                size="md"
                allowDislikes={Boolean(author?.pvp)}
              />
            </div>
          </div>

        </div>

        {commentsOpen ? (
          <ReviewComments reviewId={review._id} isAuthenticated={isAuthenticated} />
        ) : (
          <section className="mt-14">
            <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
              Comments
            </h2>
            <p className="mt-6 text-sm text-white/40">
              Comments are turned off for this review.
              {isAuthor && !commentsEverywhere && (
                <>
                  {' '}You've turned them off for all your reviews. Turn them back on in{' '}
                  <Link to="/account" className="text-brand-gold transition-colors hover:text-white">
                    Edit profile
                  </Link>
                  .
                </>
              )}
            </p>
          </section>
        )}

      </div>
    </section>
  )
}

// Reporting the review to the moderators and admins, after confirming. They
// see who reported it. Members can report 5 reviews a day; the server says
// so, and why else it won't take one.
function ReportReview({ review }) {
  // 'idle', 'confirming' or 'done'.
  const [step, setStep] = useState('idle')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const handleReport = async () => {
    setSending(true)
    setError(null)

    try {
      await reportReview(review._id)
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (step === 'done') {
    return (
      <p className="w-80 max-w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
        Reported. A moderator will take a look.
      </p>
    )
  }

  if (step === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStep('confirming')}
        className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-brand-red/60 hover:text-white"
      >
        Report
      </button>
    )
  }

  return (
    <div
      role="alertdialog"
      aria-label="Report this review"
      className="w-80 max-w-full rounded-xl border border-brand-red/40 bg-brand-red/10 p-4 backdrop-blur-sm"
    >
      <p className="text-sm text-white">
        Report this review to the moderators? They'll see that you reported it.
      </p>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setStep('idle')
            setError(null)
          }}
          disabled={sending}
          className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleReport}
          disabled={sending}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
        >
          {sending ? 'Reporting…' : 'Report'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  )
}

// Admins deleting someone else's review. It asks twice, right where the
// button was, so it takes three deliberate clicks; then it's back to the
// reviews page.
function DeleteReview({ review }) {
  const navigate = useNavigate()
  // 0: the button. 1: first "are you sure". 2: the last chance.
  const [step, setStep] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const whose = review.user ? `${review.user.username}'s` : 'this'

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      await deleteReview(review._id)
      navigate('/movie_reviews', { replace: true })
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const cancel = () => {
    setStep(0)
    setError(null)
  }

  const redButton =
    'rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60'
  const cancelButton =
    'rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

  if (step === 0) {
    return (
      <button
        type="button"
        onClick={() => setStep(1)}
        className="rounded-md border border-brand-red/60 bg-brand-red/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-red hover:bg-brand-red/20"
      >
        Delete review
      </button>
    )
  }

  return (
    <div
      role="alertdialog"
      aria-label="Delete this review"
      className="w-80 max-w-full rounded-xl border border-brand-red/40 bg-brand-red/10 p-4 backdrop-blur-sm"
    >
      {step === 1 ? (
        <p className="text-sm text-white">
          Delete {whose} review of {review.filmTitle}?
        </p>
      ) : (
        <p className="text-sm text-white">
          Are you sure? Its comments go with it, and it can't be undone. Their rating stays in
          their film list.
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={cancel} disabled={deleting} className={cancelButton}>
          Cancel
        </button>
        {step === 1 ? (
          <button type="button" onClick={() => setStep(2)} className={redButton}>
            Yes, delete
          </button>
        ) : (
          <button type="button" onClick={handleDelete} disabled={deleting} className={redButton}>
            {deleting ? 'Deleting…' : 'Delete for good'}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </div>
  )
}

// A button that flips one setting on the review and saves it straight away:
// the spoiler mark (moderators and admins, when the author didn't tick the
// box themselves, or ticked it when they didn't need to), or the author
// turning comments off. `save()` resolves to the new value.
function SettingButton({ label, save, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleClick = async () => {
    setSaving(true)
    setError(null)

    try {
      onSaved(await save())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        className="rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
      >
        {label}
      </button>

      {error && <p className="text-sm text-brand-red">{error}</p>}
    </div>
  )
}

export default ReviewDetail