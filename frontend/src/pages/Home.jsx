import Hero from '../components/hero/Hero'
import NextEvent from '../components/events/NextEvent'
import AboutClub from '../components/about/AboutClub'
import ReviewSection from '../components/reviews/ReviewSection'
import { getRecentReviews } from '../services/films'
import useApi from '../hooks/useApi'
import reviewsBg from '../assets/giphy.gif'

function Home({ isAuthenticated }) {
  // Newest first, each with its author attached by the server.
  const { data: recentReviews = [], loading } = useApi(() => getRecentReviews(15), [])

  return (
    <>
      <Hero />
      <NextEvent />
      <ReviewSection
        title="Recent Reviews"
        reviews={recentReviews}
        layout="marquee"
        backgroundUrl={reviewsBg}
        linkTo="/movie_reviews"
        emptyMessage={loading ? 'Loading reviews…' : undefined}
      />
      <AboutClub isAuthenticated={isAuthenticated} />

    </>
  )
}

export default Home