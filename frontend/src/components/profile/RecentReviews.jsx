import { Link } from 'react-router-dom'
import StarRating from '../reviews/StarRating'

function RecentReviews({ reviews, username, isOwner }) {
  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-sm text-white/40">
        {isOwner
          ? "You haven't written any reviews yet."
          : `${username} hasn't written any reviews yet.`}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {reviews.slice(0, 4).map((review) => {
        const posterUrl = review.posterPath
          ? `https://image.tmdb.org/t/p/w342${review.posterPath}`
          : null

        return (
          <Link key={review._id} to={`/reviews/${review._id}`} className="group block">
            <div className="aspect-2/3 overflow-hidden rounded-lg border border-white/10 bg-ink/60 shadow-lg shadow-black/40 transition-transform group-hover:scale-105">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={review.filmTitle}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-white/50">
                  {review.filmTitle}
                </div>
              )}
            </div>

            <p className="mt-2 truncate text-sm text-white group-hover:text-brand-gold">
              {review.filmTitle}
            </p>

            <div className="mt-1">
              <StarRating rating={review.rating} size="sm" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default RecentReviews