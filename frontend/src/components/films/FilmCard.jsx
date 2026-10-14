import { Link } from 'react-router-dom'
import filmList from '../../data/filmList'
import { getClubRating } from '../../utils/clubFilmStats'
import { getMembersWanting } from '../../utils/watchlist'

function FilmCard({ film }) {
  const posterUrl = film.posterPath
    ? `https://image.tmdb.org/t/p/w342${film.posterPath}`
    : null

  const club = getClubRating(filmList, film.tmdbId)
  const wanting = getMembersWanting(filmList, film.tmdbId).length

  return (
    <Link to={`/films/${film.tmdbId}`} className="group block">
      <div className="relative aspect-2/3 overflow-hidden rounded-lg border border-white/10 bg-ink/60 shadow-lg shadow-black/40 transition-transform group-hover:scale-105">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={film.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-white/40">
            {film.title}
          </div>
        )}

        {club.average != null && (
          <div className="absolute top-2 left-2 rounded-md border border-brand-gold/50 bg-ink/80 px-2 py-1 text-xs font-semibold text-brand-gold backdrop-blur-sm">
            ★ {club.average.toFixed(1)}
          </div>
        )}
      </div>

      <p className="mt-2 truncate text-sm font-medium text-white transition-colors group-hover:text-brand-gold">
        {film.title}
      </p>

      <p className="text-xs text-white/40">{film.year || '—'}</p>

      {club.count > 0 && (
        <p className="mt-0.5 text-xs text-brand-gold/70">
          {club.count} club {club.count === 1 ? 'rating' : 'ratings'}
        </p>
      )}

      {club.count === 0 && wanting > 0 && (
        <p className="mt-0.5 text-xs text-white/40">
          {wanting} {wanting === 1 ? 'member wants' : 'members want'} to see this
        </p>
      )}
    </Link>
  )
}

export default FilmCard