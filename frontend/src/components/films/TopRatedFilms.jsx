import { Link } from 'react-router-dom'
import StarRating from '../reviews/StarRating'

function TopRatedFilms({ films, onLight = false }) {
  if (!films || films.length === 0) {
    return (
      <p className={`text-sm ${onLight ? 'text-ink/50' : 'text-white/40'}`}>
        No ratings yet. Rate a film and it will show up here.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
      {films.map((film) => {
        const posterUrl = film.posterPath
          ? `https://image.tmdb.org/t/p/w342${film.posterPath}`
          : null

        return (
          <Link key={film.tmdbId} to={`/films/${film.tmdbId}`} className="group block">
            <div
              className={`aspect-2/3 overflow-hidden rounded-lg border bg-ink/80 shadow-lg transition-transform group-hover:scale-105 ${
                onLight
                  ? 'border-ink/10 shadow-black/20'
                  : 'border-white/10 shadow-black/40'
              }`}
            >
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={film.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-white/50">
                  {film.title}
                </div>
              )}
            </div>

            <p
              className={`mt-2 truncate text-sm font-medium transition-colors ${
                onLight
                  ? 'text-ink group-hover:text-brand-red'
                  : 'text-white group-hover:text-brand-gold'
              }`}
            >
              {film.title}
            </p>

            <div className="mt-1">
              <StarRating rating={film.average} size="sm" onLight={onLight} />
            </div>

            <p className={`mt-0.5 text-xs ${onLight ? 'text-ink/50' : 'text-white/40'}`}>
              {film.average.toFixed(1)} · {film.count} {film.count === 1 ? 'rating' : 'ratings'}
            </p>
          </Link>
        )
      })}
    </div>
  )
}

export default TopRatedFilms