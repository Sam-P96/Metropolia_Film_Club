import { Link } from 'react-router-dom'
import StarRating from './StarRating'
import { timeAgo } from '../../utils/timeAgo'

function bannerStyle(banner) {
  if (!banner) return {}

  if (banner.type === 'image') {
    return {
      backgroundImage: `url(${banner.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }

  return { backgroundColor: banner.value }
}

function ReviewCard({ review }) {
  const { user } = review

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

        <div className="flex min-h-56 min-w-0 flex-1 flex-col p-5">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="text-lg leading-tight font-semibold">
              {review.filmTitle}{' '}
              <span className="font-normal text-white/40">({review.filmYear})</span>
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

      <div
        className="relative border-t border-white/10"
        style={bannerStyle(user.reviewCardBanner)}
      >
        <div className="absolute inset-0 bg-linear-to-r from-ink/0 via-ink/40 to-ink/80" />

        <div className="relative flex items-center justify-end gap-4 px-5 py-4">
          <div className="text-right">
            <p className="font-semibold drop-shadow">{user.username}</p>
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
        </div>
      </div>

    </article>
  )
}

export default ReviewCard