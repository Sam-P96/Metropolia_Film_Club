import { Link } from 'react-router-dom'
import users from '../data/users'
import reviews from '../data/reviews'
import filmList from '../data/filmList'
import SearchBar from '../components/search/SearchBar'
import TopRatedFilms from '../components/films/TopRatedFilms'
import ReviewSection from '../components/reviews/ReviewSection'
import { getTopRatedFilms } from '../utils/clubFilmStats'
import reviewsBg from '../assets/giphy.gif'


function MovieReviews() {
  const topRated = getTopRatedFilms(filmList, 12)

  const recentReviews = [...reviews]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map((review) => ({
      ...review,
      user: users.find((user) => user._id === review.userId),
    }))
    .filter((review) => review.user)

  return (
    <section className="text-white">

      <div className="border-b border-white/10 bg-ink/40 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-8 py-20 text-center">
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

        <TopRatedFilms films={topRated} />
      </div>

      <ReviewSection
        title="Recent Reviews"
        reviews={recentReviews}
        layout="marquee"
        backgroundUrl={reviewsBg}
        linkTo="/films?mode=browse&sort=release_date.desc"
      />
    </section>
  )
}

export default MovieReviews