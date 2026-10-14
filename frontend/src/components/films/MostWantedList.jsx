import { Link } from 'react-router-dom'

// The ranked rows of the plan-to-watch leaderboard. Used by the top-four
// block on the club events page and by the full leaderboard page.
// `films` must start at rank 1: the first film sets the scale for every bar.
function MostWantedList({ films }) {
  const topCount = films[0]?.count ?? 0

  return (
    <ol className="space-y-2">
      {films.map((film, index) => (
        <li key={film.tmdbId}>
          <Link
            to={`/films/${film.tmdbId}`}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10 sm:gap-4 sm:p-4"
          >
            <span
              className={`w-6 shrink-0 text-center text-lg font-bold sm:w-8 sm:text-xl ${
                index < 3 ? 'text-brand-gold' : 'text-white/25'
              }`}
            >
              {index + 1}
            </span>

            {film.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
                alt=""
                loading="lazy"
                className="w-10 shrink-0 self-start rounded sm:w-12"
              />
            ) : (
              <div className="aspect-2/3 w-10 shrink-0 rounded bg-plum/60 sm:w-12" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium transition-colors group-hover:text-brand-gold">
                {film.title}
                {film.year && (
                  <span className="ml-2 font-normal text-white/40">
                    {film.year}
                  </span>
                )}
              </p>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand-gold"
                  style={{ width: `${(film.count / topCount) * 100}%` }}
                />
              </div>
            </div>

            <span className="shrink-0 text-right">
              <span className="block text-lg font-bold">{film.count}</span>
              <span className="block text-[10px] tracking-wide text-white/40 uppercase">
                {film.count === 1 ? 'member' : 'members'}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

export default MostWantedList
