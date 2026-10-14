import { useParams, Link } from 'react-router-dom'
import ReviewCard from '../components/reviews/ReviewCard'
import StarRating from '../components/reviews/StarRating'
import { getFilm } from '../services/tmdb'
import { getFilmClub, getFilmReviews } from '../services/films'
import useApi from '../hooks/useApi'

function FilmReviews() {
  const { tmdbId } = useParams()
  const id = Number(tmdbId)

  const { data: film, loading } = useApi(() => getFilm(id), [id])
  const clubResult = useApi(() => getFilmClub(id), [id])
  const reviewsResult = useApi(() => getFilmReviews(id), [id])

  const club = clubResult.data?.rating ?? { average: null, count: 0 }
  const filmReviews = reviewsResult.data ?? []

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

            {!reviewsResult.loading && (
              <p className="mt-2 text-sm text-white/50">
                {filmReviews.length}{' '}
                {filmReviews.length === 1 ? 'club review' : 'club reviews'}
              </p>
            )}

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
              {reviewsResult.loading
                ? 'Loading reviews…'
                : reviewsResult.error
                  ? "Couldn't load reviews. Try refreshing the page."
                  : 'No one has reviewed this yet.'}
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