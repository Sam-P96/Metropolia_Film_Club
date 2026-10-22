import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import StarRating from './StarRating'
import { setReviewLiked } from '../../services/films'
import { timeAgo } from '../../utils/timeAgo'
import { getCurrentUser } from '../../utils/currentUser'

const BANNER_ALPHA = {
  opaque: 1,
  translucent: 0.55,
  glass: 0.35,
}

function bannerLayerStyle(banner) {
  if (!banner) return {}

  const style = banner.style || 'opaque'
  const alpha = BANNER_ALPHA[style] ?? 1

  const base =
    banner.type === 'image' && banner.imageUrl
      ? {
          backgroundImage: `url(${banner.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { backgroundColor: banner.color || '#2D1B47' }

  const glassExtras =
    style === 'glass'
      ? {
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        }
      : {}

  return { ...base, opacity: alpha, ...glassExtras }
}

function ReviewCard({ review, onLikeChange }) {
  const { user } = review

  // The profile's "No reviews yet" stand-in has no film, so there's nothing
  // to link to or like.
  const isPlaceholder = !review.tmdbId

  // A list that shows the same review twice (the marquee) keeps the likes
  // itself and passes onLikeChange, so both copies agree. Otherwise the card
  // remembers them.
  const [ownLikes, setOwnLikes] = useState(null)
  const likes = onLikeChange ? review : (ownLikes ?? review)

  const posterUrl = review.posterPath
    ? `https://image.tmdb.org/t/p/w342${review.posterPath}`
    : null

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-plum/40 text-white shadow-xl shadow-black/40 backdrop-blur-md">

      <div className="flex">
        <div className="relative w-36 shrink-0 bg-ink/60 sm:w-44">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={review.filmTitle}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-white/40">
              {review.filmTitle}
            </div>
          )}
        </div>

        {/* min-h-64 fits the tallest case (two-line title, four lines of review),
            so every card is the same height and short titles leave the slack above "Read more" */}
        <div className="flex min-h-64 min-w-0 flex-1 flex-col p-5">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-lg leading-tight font-semibold">
              {isPlaceholder ? review.filmTitle : (
                <Link
                  to={`/films/${review.tmdbId}`}
                  className="transition-colors hover:text-brand-gold"
                >
                  {review.filmTitle}
                </Link>
              )}{' '}
              {review.filmYear && (
                <span className="font-normal text-white/40">({review.filmYear})</span>
              )}
            </h3>
            <span className="shrink-0 text-xs text-white/40">
              {timeAgo(review.createdAt)}
            </span>
          </div>

          <div className="mb-3">
            <StarRating rating={review.rating} />
          </div>

          {review.containsSpoilers ? (
            <div className="relative">
              <p className="line-clamp-4 text-sm leading-relaxed text-white/70 blur-sm select-none">
                {review.text}
              </p>
              <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-brand-gold">
                Contains spoilers
              </p>
            </div>
          ) : (
            <p className="line-clamp-4 text-sm leading-relaxed text-white/70">
              {review.text}
            </p>
          )}

          <Link
            to={`/reviews/${review._id}`}
            className="mt-auto self-end pt-4 text-sm font-medium text-brand-gold transition-colors hover:text-white"
          >
            Read more...
          </Link>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div
          className="absolute inset-0"
          style={bannerLayerStyle(user.reviewCardBanner)}
        />

        <div className="absolute inset-0 bg-linear-to-r from-ink/0 via-ink/40 to-ink/80" />

        <div className="relative flex items-center gap-4 px-5 py-4">
          {!isPlaceholder && (
            <LikeButton
              reviewId={review._id}
              likeCount={likes.likeCount ?? 0}
              likedByMe={likes.likedByMe ?? false}
              onChange={onLikeChange ?? setOwnLikes}
            />
          )}

          <Link
            to={`/users/${user._id}`}
            className="group ml-auto flex items-center gap-4"
          >
            <div className="text-right">
              <p className="font-semibold drop-shadow transition-colors group-hover:text-brand-gold">
                {user.username}
              </p>
              <p className="text-sm text-white/60">{user.memberTitle}</p>
            </div>

            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red font-bold ring-2 ring-white/20">
                {user.username[0].toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </div>

    </article>
  )
}

// 999, then 1k, 1.2k, 12.5k… so the pill stays small.
const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

// Sits on the author banner, which can be any image, so it brings its own
// dark frosted backing. Logged-out visitors are sent to log in, then back.
function LikeButton({ reviewId, likeCount, likedByMe, onChange }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [saving, setSaving] = useState(false)
  const [popping, setPopping] = useState(false)

  const goToLogin = () =>
    navigate('/login', { state: { from: location.pathname + location.search } })

  const handleClick = async () => {
    if (!getCurrentUser()) {
      goToLogin()
      return
    }

    if (saving) return

    const before = { likeCount, likedByMe }
    const liked = !likedByMe

    // Show it straight away, then settle on what the server says.
    onChange({ likeCount: likeCount + (liked ? 1 : -1), likedByMe: liked })
    setPopping(liked)
    setSaving(true)

    try {
      onChange(await setReviewLiked(reviewId, liked))
    } catch (err) {
      onChange(before)
      if (err.status === 401) goToLogin()
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={likedByMe}
      aria-label={`Like this review, ${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-base font-semibold tabular-nums backdrop-blur-md transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold active:scale-95 ${
        likedByMe
          ? 'border-white/55 bg-[rgba(14,8,20,0.74)] text-white hover:border-white/75'
          : 'border-white/20 bg-[rgba(14,8,20,0.62)] text-[#d8cfe3] hover:border-white/35 hover:text-white'
      }`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={likedByMe ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={popping ? 'motion-safe:animate-like-pop' : undefined}
        onAnimationEnd={() => setPopping(false)}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>

      {likeCount > 0 && <span>{compactNumber.format(likeCount).toLowerCase()}</span>}
    </button>
  )
}

export default ReviewCard