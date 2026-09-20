function PosterCard({ movie }) {
  const imageUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
    : null

  return (
    <div className="shrink-0 pr-4">
      <div className="h-60 w-40 overflow-hidden rounded-lg bg-plum shadow-lg shadow-black/40">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={movie.title}
            // loading lazy means download this when user srolls to it
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
            // only loads if theres no imageUrl
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-white/40">
            {movie.title}
          </div>
        )}
      </div>
    </div>
  )
}

export default PosterCard