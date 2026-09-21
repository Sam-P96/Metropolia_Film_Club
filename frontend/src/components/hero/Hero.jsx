import { useState, useEffect } from 'react'
import PosterMarquee from './PosterMarquee'
import { getTrending } from '../../services/tmdb'

// This was the placeholder file before we were able to use getTrending function
// const placeholder = Array.from({ length: 20 }, (_, i) => ({
//   id: i + 1,
//   title: `Film ${i + 1}`,
//   poster_path: null,
// }))

function rotate(array, by) {
  if (array.length === 0) return array
  const offset = by % array.length
  return [...array.slice(offset), ...array.slice(0, offset)]
}

function Hero() {
  const [movies, setMovies] = useState([])

  useEffect(() => {
    getTrending()
      .then(setMovies)
      .catch((error) => console.error(error))
  }, [])

  return (
    <section className="relative overflow-hidden">
      <div className="h-[630px] space-y-4 opacity-40">
        <PosterMarquee movies={rotate(movies, 0)} direction="left" speed={100} />
        <PosterMarquee movies={rotate(movies, 7)} direction="right" speed={100} />
        <PosterMarquee movies={rotate(movies, 14)} direction="left" speed={100} />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-ink/70 via-ink/50 to-ink" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <h1 className="mb-4 text-5xl font-bold text-white">
          Welcome to Metropolia <span className="text-brand-gold">Film Club</span>
        </h1>
        <p className="max-w-xl text-lg text-white/70">
          Find club events and screenings near you.
        </p>
      </div>
    </section>
  )
}

export default Hero