import PosterMarquee from './PosterMarquee'

// Temporary — replaced by the TMDB fetch later
const placeholder = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  title: `Film ${i + 1}`,
  poster_path: null,
}))

function Hero() {
  const movies = placeholder

  return (
    <section className="relative overflow-hidden">
      <div className="h-[630px] space-y-4 opacity-40">
        <PosterMarquee movies={movies} direction="left" speed={70} />
        <PosterMarquee movies={movies} direction="right" speed={90} />
        <PosterMarquee movies={movies} direction="left" speed={80} />
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