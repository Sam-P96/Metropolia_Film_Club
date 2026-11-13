import Hero from '../components/hero/Hero'
import NextEvent from '../components/events/NextEvent'
import AboutClub from '../components/about/AboutClub'
import ReviewSection from '../components/reviews/ReviewSection'
import useReviewSorts from '../hooks/useReviewSorts'
import reviewsVideo from '../assets/reviews-bg.mp4'
import reviewsPoster from '../assets/reviews-bg-poster.webp'

function Home({ isAuthenticated }) {
  // Each with its author attached by the server.
  const reviews = useReviewSorts(38)

  return (
    <>
      <Hero isAuthenticated={isAuthenticated} />
      <NextEvent />
      <ReviewSection
        title={reviews.title}
        reviews={reviews.reviews}
        sort={reviews.sort}
        onSortChange={reviews.setSort}
        sorts={reviews.options}
        loading={reviews.loading}
        layout="marquee"
        backgroundVideo={reviewsVideo}
        backgroundPoster={reviewsPoster}
        linkTo="/movie_reviews"
      />
      <AboutClub isAuthenticated={isAuthenticated} />

    </>
  )
}

export default Home