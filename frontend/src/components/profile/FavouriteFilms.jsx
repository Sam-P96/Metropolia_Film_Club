function FavouriteFilms({ films, isOwner, username }) {
  const slots = [0, 1, 2, 3]

  const hasAny = films && films.length > 0

  if (!hasAny && !isOwner) {
    return (
      <p className="text-sm text-white/40">
        {username} hasn’t picked any favourites yet.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {slots.map((index) => {
        const film = films ? films[index] : null

        if (!film) {
          return (
            <div
              key={`empty-${index}`}
              className="flex aspect-2/3 items-center justify-center rounded-lg border border-dashed border-white/15 p-3 text-center text-xs text-white/30"
            >
              {isOwner ? 'Pick a favourite' : ''}
            </div>
          )
        }

        const posterUrl = film.posterPath
          ? `https://image.tmdb.org/t/p/w342${film.posterPath}`
          : null

        return (
          <div
            key={film.tmdbId}
            className="aspect-2/3 overflow-hidden rounded-lg border border-white/10 bg-ink/60 shadow-lg shadow-black/40"
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
        )
      })}
    </div>
  )
}

export default FavouriteFilms