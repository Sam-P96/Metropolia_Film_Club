import Hero from '../components/hero/Hero'
import NextEvent from '../components/events/NextEvent'
import AboutClub from '../components/about/AboutClub'
import ReviewSection from '../components/reviews/ReviewSection'
import users from '../data/users'
import reviews from '../data/reviews'
import reviewsBg from '../assets/giphy.gif'

// Temporary: the backend will sort and attach users later
const recentReviews = [...reviews]
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, 15)
  .map((review) => ({
    ...review,
    user: users.find((user) => user._id === review.userId),
  }))

function Home() {
  return (
    <>
      <Hero />
      <NextEvent />
      <ReviewSection
        title="Recent Reviews"
  reviews={recentReviews}
  layout="marquee"
  backgroundUrl={reviewsBg}
  linkTo="/reviews"
      />
      <AboutClub />
      
    </>
  )
}

export default Home