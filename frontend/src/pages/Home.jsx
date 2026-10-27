import Hero from '../components/hero/Hero'
import NextEvent from '../components/events/NextEvent'
import AboutClub from '../components/about/AboutClub'
import ReviewSection from '../components/reviews/ReviewSection'
import useReviewSorts from '../hooks/useReviewSorts'
import reviewsBg from '../assets/giphy.gif'

function Home({ isAuthenticated }) {
  // Each with its author attached by the server.
  const reviews = useReviewSorts(30)

  return (
    <>
      <Hero />
      <NextEvent />
      <ReviewSection
        title={reviews.title}
        reviews={reviews.reviews}
        sort={reviews.sort}
        onSortChange={reviews.setSort}
        layout="marquee"
        backgroundUrl={reviewsBg}
        linkTo="/movie_reviews"
        emptyMessage={reviews.loading ? 'Loading reviews…' : undefined}
      />
      <AboutClub isAuthenticated={isAuthenticated} />

    </>
  )
}

export default Home