import PosterCard from './PosterCard'

function PosterMarquee({ movies, direction = 'left', speed = 60 }) {
  if (!movies || movies.length === 0) return null

  const looped = [...movies, ...movies]

  return (
    <div className="overflow-hidden">
      <div
        className="flex w-max"
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
        }}
      >
        {looped.map((movie, index) => (
          <PosterCard key={`${movie.id}-${index}`} movie={movie} />
        ))}
      </div>
    </div>
  )
}

export default PosterMarquee