import { useState } from 'react'
import Hero from '../components/hero/Hero'
import NextEvent from '../components/events/NextEvent'
import AboutClub from '../components/about/AboutClub'
import ReviewSection from '../components/reviews/ReviewSection'
import { getReviews } from '../services/films'
import useApi from '../hooks/useApi'
import reviewsBg from '../assets/giphy.gif'

function Home({ isAuthenticated }) {
  // Each with its author attached by the server. Both lists load up front,
  // so the Recent / Top toggle switches straight away.
  const [reviewSort, setReviewSort] = useState('recent')
  const recent = useApi(() => getReviews(30), [])
  const top = useApi(() => getReviews(30, 'top'), [])
  const reviews = reviewSort === 'top' ? top : recent

  return (
    <>
      <Hero />
      <NextEvent />
      <ReviewSection
        title={reviewSort === 'top' ? 'Top Reviews' : 'Recent Reviews'}
        reviews={reviews.data ?? []}
        sort={reviewSort}
        onSortChange={setReviewSort}
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