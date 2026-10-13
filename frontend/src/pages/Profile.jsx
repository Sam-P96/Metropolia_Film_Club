import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import users from '../data/users'
import reviews from '../data/reviews'
import filmList from '../data/filmList'
import ReviewCard from '../components/reviews/ReviewCard'
import ReviewCardEditor from '../components/profile/ReviewCardEditor'
import ProfileEditor from '../components/profile/ProfileEditor'
import ProfileStats from '../components/profile/ProfileStats'
import RecentReviews from '../components/profile/RecentReviews'
import FavouriteFilms from '../components/profile/FavouriteFilms'
import FilmSearchPicker from '../components/profile/FilmSearchPicker'
import Watchlist from '../components/profile/Watchlist'
import { getProfileStats } from '../utils/profileStats'
import { canViewProfile } from '../utils/profileVisibility'
import { getUserWatchlist } from '../utils/watchlist'

// PLACEHOLDER: real accounts come from MongoDB with ids like '68dca4f2...',
// which will never match the 'u1' ids in data/users.js. Until profiles are
// served by the backend, /account always shows the first placeholder user.
const LOGGED_IN_USER_ID = users[0]._id

const MAX_FAVOURITES = 4

function formatJoined(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Helsinki',
  })
}

function Profile() {
  const { userId } = useParams()

  // PLACEHOLDER: a mutable copy of the static data file, so Save has somewhere
  // to write. Replaced by a fetch + PATCH once the backend serves profiles.
  const [allUsers, setAllUsers] = useState(users)

  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(null)

  // Leaving a profile while editing should throw the draft away
  useEffect(() => {
    setDraft(null)
    setEditing(null)
  }, [userId])

  const profileUser = userId
    ? allUsers.find((user) => user._id === userId)
    : allUsers.find((user) => user._id === LOGGED_IN_USER_ID)

  if (!profileUser) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">Member not found</h1>
        <p className="mt-3 text-white/60">There is no member with that id.</p>
      </section>
    )
  }

  const isOwner = profileUser._id === LOGGED_IN_USER_ID

  if (!canViewProfile(profileUser, isOwner)) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">{profileUser.username}</h1>
        <p className="mt-3 text-white/60">This profile is private.</p>
      </section>
    )
  }

  // While editing, everything renders from the draft instead of the saved user.
  // This is what makes the preview live.
  const displayUser = draft || profileUser

  const startEditing = (panel) => {
    setDraft({ ...profileUser })
    setEditing(panel)
  }

  const handleDraftChange = (field, value) => {
    setDraft({ ...draft, [field]: value })
  }

  const handleAddFavourite = (film) => {
    const current = draft.favouriteFilms || []

    if (current.length >= MAX_FAVOURITES) return
    if (current.some((existing) => existing.tmdbId === film.tmdbId)) return

    setDraft({ ...draft, favouriteFilms: [...current, film] })
  }

  const handleRemoveFavourite = (tmdbId) => {
    const current = draft.favouriteFilms || []

    setDraft({
      ...draft,
      favouriteFilms: current.filter((film) => film.tmdbId !== tmdbId),
    })
  }

  const handleSave = () => {
    setAllUsers(allUsers.map((user) => (user._id === draft._id ? draft : user)))
    setDraft(null)
    setEditing(null)
  }

  const handleCancel = () => {
    setDraft(null)
    setEditing(null)
  }

  const userReviews = reviews
    .filter((review) => review.userId === profileUser._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const stats = getProfileStats(userReviews)

  const watchlist = getUserWatchlist(filmList, profileUser._id).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  )

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
    user: displayUser,
  }

  const buttonClasses =
    'rounded-md border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

  const smallButtonClasses =
    'rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

  return (
    <section className="text-white">
      <div className="mx-auto max-w-5xl px-8 py-20">

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">

          {/* Left column: card + edit buttons only */}
          <div className="w-120 max-w-full shrink-0">
            <ReviewCard review={showcaseReview} />

            {isOwner && editing === null && (
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => startEditing('card')} className={buttonClasses}>
                  Edit review card
                </button>
                <button onClick={() => startEditing('profile')} className={buttonClasses}>
                  Edit profile
                </button>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">{displayUser.username}</h1>
            <p className="mt-1 text-sm text-brand-gold">{displayUser.memberTitle}</p>

            {displayUser.bio && (
              <p className="mt-4 leading-relaxed text-white/70">
                {displayUser.bio}
              </p>
            )}

            <p className="mt-4 text-sm text-white/40">
              Member since {formatJoined(displayUser.joinedAt)}
            </p>
          </div>

        </div>

        {/* Editors: moved out of the left column so they span the full width */}
        {isOwner && editing === 'card' && (
          <ReviewCardEditor
            draft={draft}
            onChange={handleDraftChange}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {isOwner && editing === 'profile' && (
          <ProfileEditor
            draft={draft}
            onChange={handleDraftChange}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        <div className="mt-14">
          <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Stats
          </h2>
          <ProfileStats stats={stats} />
        </div>

        <div className="mt-12">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
              Recent reviews
            </h2>

            <Link
              to={`/users/${profileUser._id}/films`}
              className={smallButtonClasses}
            >
              Show more reviews by this user
            </Link>
          </div>

          <RecentReviews
            reviews={userReviews}
            username={displayUser.username}
            isOwner={isOwner}
          />
        </div>

        <div className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
              Favourite films
            </h2>

            {isOwner && editing === null && (
              <button
                onClick={() => startEditing('favourites')}
                className={smallButtonClasses}
              >
                Edit
              </button>
            )}
          </div>

          <FavouriteFilms
            films={displayUser.favouriteFilms}
            isOwner={isOwner}
            username={displayUser.username}
            isEditing={editing === 'favourites'}
            onRemove={handleRemoveFavourite}
          />

          {isOwner && editing === 'favourites' && (
            <FilmSearchPicker
              current={displayUser.favouriteFilms || []}
              onAdd={handleAddFavourite}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </div>

        <div className="mt-12">
          <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Plan to watch / rewatch
          </h2>

          <Watchlist
            entries={watchlist}
            profileUserId={profileUser._id}
            username={displayUser.username}
            isOwner={isOwner}
          />
        </div>

      </div>
    </section>
  )
}

export default Profile