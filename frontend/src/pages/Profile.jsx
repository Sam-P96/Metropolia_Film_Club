import { useParams } from 'react-router-dom'
import users from '../data/users'
import reviews from '../data/reviews'
import ReviewCard from '../components/reviews/ReviewCard'
import ProfileStats from '../components/profile/ProfileStats'
import FavouriteFilms from '../components/profile/FavouriteFilms'
import { getProfileStats } from '../utils/profileStats'
import { canViewProfile } from '../utils/profileVisibility'

// PLACEHOLDER: real accounts come from MongoDB with ids like '68dca4f2...',
// which will never match the 'u1' ids in data/users.js. Until profiles are
// served by the backend, /account always shows the first placeholder user.
const LOGGED_IN_USER = users[0]

function formatJoined(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Helsinki',
  })
}

function Profile() {
  const { userId } = useParams()

  const profileUser = userId
    ? users.find((user) => user._id === userId)
    : LOGGED_IN_USER

  if (!profileUser) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">Member not found</h1>
        <p className="mt-3 text-white/60">There is no member with that id.</p>
      </section>
    )
  }

  const isOwner = profileUser._id === LOGGED_IN_USER._id

  if (!canViewProfile(profileUser, isOwner)) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">{profileUser.username}</h1>
        <p className="mt-3 text-white/60">This profile is private.</p>
      </section>
    )
  }

  const userReviews = reviews
    .filter((review) => review.userId === profileUser._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const stats = getProfileStats(userReviews)

  const emptyShowcase = {
    _id: 'placeholder',
    filmTitle: 'No reviews yet',
    filmYear: new Date().getFullYear(),
    posterPath: null,
    genres: [],
    rating: null,
    text: isOwner
      ? "You haven't written a review yet. When you do, it will show up here — this is the card other members see."
      : `${profileUser.username} hasn't written a review yet.`,
    containsSpoilers: false,
    likeCount: 0,
    createdAt: new Date().toISOString(),
  }

  const showcaseReview = {
    ...(userReviews[0] || emptyShowcase),
    user: profileUser,
  }

  const buttonClasses =
    'rounded-md border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

  return (
    <section className="text-white">
      <div className="mx-auto max-w-5xl px-8 py-20">

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">

          <div className="w-120 max-w-full shrink-0">
            <ReviewCard review={showcaseReview} />

            {isOwner && (
              <div className="mt-5 flex flex-wrap gap-3">
                <button className={buttonClasses}>Edit review card</button>
                <button className={buttonClasses}>Edit profile</button>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">{profileUser.username}</h1>
            <p className="mt-1 text-sm text-brand-gold">{profileUser.memberTitle}</p>

            {profileUser.bio && (
              <p className="mt-4 leading-relaxed text-white/70">
                {profileUser.bio}
              </p>
            )}

            <p className="mt-4 text-sm text-white/40">
              Member since {formatJoined(profileUser.joinedAt)}
            </p>
          </div>

        </div>

        <div className="mt-14">
          <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Stats
          </h2>
          <ProfileStats stats={stats} />
        </div>

        <div className="mt-12">
          <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Favourite films
          </h2>
          <FavouriteFilms
            films={profileUser.favouriteFilms}
            isOwner={isOwner}
            username={profileUser.username}
          />
        </div>

      </div>
    </section>
  )
}

export default Profile