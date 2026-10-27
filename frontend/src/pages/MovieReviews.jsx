import { Link } from 'react-router-dom'
import SearchBar from '../components/search/SearchBar'
import TopRatedFilms from '../components/films/TopRatedFilms'
import ReviewSection from '../components/reviews/ReviewSection'
import CriticsLeaderboard from '../components/reviews/CriticsLeaderboard'
import { getTopRated } from '../services/films'
import useApi from '../hooks/useApi'
import useReviewSorts from '../hooks/useReviewSorts'
import GifBackground from '../components/GifBackground'
import reviewsBg from '../assets/giphy.gif'
import artLoveGif from '../assets/Art Glow GIF by Lucie Mullen.gif'


function MovieReviews() {
  const top = useApi(() => getTopRated(12), [])
  const reviews = useReviewSorts(30)

  return (
    <section className="text-white">

      <div className="relative overflow-hidden border-b border-white/10">
        <GifBackground src={artLoveGif} />

        <div className="relative mx-auto max-w-4xl px-8 py-20 text-center">
          <h1 className="text-4xl font-bold">
            Movie <span className="text-brand-gold">Reviews</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/60">
            Find a film, see what the club made of it, and add your own take.
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <SearchBar to="/films" size="lg" placeholder="Search for a film..." />
          </div>

          <Link
            to="/films"
            className="mt-5 inline-block text-sm font-medium text-brand-gold transition-colors hover:text-white"
          >
            Or browse everything →
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-16">
        <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
          Top rated by the club
        </h2>

        {top.loading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : (
          <TopRatedFilms films={top.data ?? []} />
        )}
      </div>

      {/* "See all reviews" goes to Browse films, showing only films the
          club has reviewed. */}
      <ReviewSection
        title={reviews.title}
        reviews={reviews.reviews}
        sort={reviews.sort}
        onSortChange={reviews.setSort}
        emptyMessage={reviews.loading ? 'Loading reviews…' : undefined}
        layout="marquee"
        backgroundUrl={reviewsBg}
        linkTo="/films?mode=browse&reviewed=1&sort=release_date.desc"
      />

      <CriticsLeaderboard />
    </section>
  )
}

export default MovieReviews