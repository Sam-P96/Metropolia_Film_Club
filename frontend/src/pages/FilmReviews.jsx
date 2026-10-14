import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import users from '../data/users'
import reviews from '../data/reviews'
import filmList from '../data/filmList'
import ReviewCard from '../components/reviews/ReviewCard'
import StarRating from '../components/reviews/StarRating'
import { getFilm } from '../services/tmdb'
import { getClubRating } from '../utils/clubFilmStats'

function FilmReviews() {
  const { tmdbId } = useParams()
  const id = Number(tmdbId)

  const [film, setFilm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    setLoading(true)

    getFilm(id)
      .then((data) => {
        if (!cancelled) setFilm(data)
      })
      .catch(() => {
        if (!cancelled) setFilm(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const club = getClubRating(filmList, id)

  const filmReviews = reviews
    .filter((review) => review.tmdbId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((review) => ({
      ...review,
      user: users.find((user) => user._id === review.userId),
    }))
    .filter((review) => review.user)

  const posterUrl = film?.posterPath
    ? `https://image.tmdb.org/t/p/w185${film.posterPath}`
    : null

  return (
    <section className="text-white">
      <div className="mx-auto max-w-5xl px-8 py-20">

        <Link
          to={`/films/${id}`}
          className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
        >
          ← Back to the film
        </Link>

        <div className="mt-8 flex items-start gap-6">
          {posterUrl && (
            <div className="w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-lg shadow-black/40">
              <img src={posterUrl} alt={film.title} className="w-full" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-3xl font-bold">
              {loading ? 'Loading…' : film ? film.title : 'Film'}
              {film?.year && (
                <span className="font-normal text-white/40"> ({film.year})</span>
              )}
            </h1>

            <p className="mt-2 text-sm text-white/50">
              {filmReviews.length}{' '}
              {filmReviews.length === 1 ? 'club review' : 'club reviews'}
            </p>

            {club.average != null && (
              <div className="mt-3">
                <StarRating rating={club.average} size="md" />
                <p className="mt-1 text-xs text-white/40">
                  {club.average.toFixed(1)} from {club.count}{' '}
                  {club.count === 1 ? 'member' : 'members'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12">
          {filmReviews.length === 0 ? (
            <p className="text-sm text-white/40">
              No one has reviewed this yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {filmReviews.map((review) => (
                <ReviewCard key={review._id} review={review} />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}

export default FilmReviews