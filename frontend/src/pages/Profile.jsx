import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReviewCard from '../components/reviews/ReviewCard'
import ReviewCardEditor from '../components/profile/ReviewCardEditor'
import ProfileEditor from '../components/profile/ProfileEditor'
import ProfileStats from '../components/profile/ProfileStats'
import RecentReviews from '../components/profile/RecentReviews'
import FavouriteFilms from '../components/profile/FavouriteFilms'
import FilmSearchPicker from '../components/profile/FilmSearchPicker'
import Watchlist from '../components/profile/Watchlist'
import { getUser, getUserFilms, getUserReviews, updateMe } from '../services/users'
import useApi from '../hooks/useApi'
import { getCurrentUser } from '../utils/currentUser'
import { getProfileStats } from '../utils/profileStats'
import { isWanted } from '../utils/watchlist'

const MAX_FAVOURITES = 4

// What a member can change about themselves. The server only accepts these.
const EDITABLE_FIELDS = [
  'bio',
  'privacy',
  'memberTitle',
  'avatarUrl',
  'reviewCardBanner',
  'favouriteFilms',
]

function formatJoined(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Helsinki',
  })
}

function Profile() {
  const { userId } = useParams()
  const [currentUser] = useState(getCurrentUser)

  // /account has no id in the URL: it's whoever is logged in.
  const profileId = userId ?? currentUser?._id

  const profile = useApi(() => getUser(profileId), [profileId], {
    enabled: Boolean(profileId),
  })

  if (profile.loading) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        Loading…
      </section>
    )
  }

  if (!profile.data) {
    const notFound = !profileId || profile.error?.status === 404

    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">
          {notFound ? 'Member not found' : "Couldn't load this profile"}
        </h1>
        <p className="mt-3 text-white/60">
          {notFound
            ? 'There is no member with that id.'
            : 'Something went wrong on our end. Try refreshing the page.'}
        </p>
      </section>
    )
  }

  // The server leaves the details out of someone else's private profile.
  if (profile.data.restricted) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">{profile.data.username}</h1>
        <p className="mt-3 text-white/60">This profile is private.</p>
      </section>
    )
  }

  // Keyed by member, so leaving a profile mid-edit throws the draft away.
  return (
    <ProfileView
      key={profile.data._id}
      profileUser={profile.data}
      isOwner={profile.data._id === currentUser?._id}
      onSaved={profile.setData}
    />
  )
}

function ProfileView({ profileUser, isOwner, onSaved }) {
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const reviewsResult = useApi(() => getUserReviews(profileUser._id), [profileUser._id])
  const filmsResult = useApi(() => getUserFilms(profileUser._id), [profileUser._id])

  // While editing, everything renders from the draft instead of the saved user.
  // This is what makes the preview live.
  const displayUser = draft || profileUser

  const startEditing = (panel) => {
    setDraft({ ...profileUser })
    setEditing(panel)
    setSaveError(null)
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

  const handleSave = async () => {
    const changes = {}
    EDITABLE_FIELDS.forEach((field) => {
      changes[field] = draft[field]
    })

    setSaving(true)
    setSaveError(null)

    try {
      const saved = await updateMe(changes)
      onSaved(saved)
      setDraft(null)
      setEditing(null)
    } catch (err) {
      // Keep the draft so nothing typed is lost.
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft(null)
    setEditing(null)
    setSaveError(null)
  }

  const userReviews = reviewsResult.data ?? []

  const stats = getProfileStats(userReviews)

  const watchlist = (filmsResult.data ?? [])
    .filter(isWanted)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

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

        {saveError && (
          <p className="mt-5 rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white">
            {saveError}
          </p>
        )}

        {saving && (
          <p className="mt-5 text-sm text-white/50">Saving…</p>
        )}

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

          {reviewsResult.loading ? (
            <p className="text-sm text-white/40">Loading…</p>
          ) : (
            <RecentReviews
              reviews={userReviews}
              username={displayUser.username}
              isOwner={isOwner}
            />
          )}
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

          {filmsResult.loading ? (
            <p className="text-sm text-white/40">Loading…</p>
          ) : (
            <Watchlist
              entries={watchlist}
              username={displayUser.username}
              isOwner={isOwner}
            />
          )}
        </div>

      </div>
    </section>
  )
}

export default Profile