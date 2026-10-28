import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { followUser, unfollowUser } from '../../services/users'
import { getCurrentUser } from '../../utils/currentUser'

// Follow / Unfollow beside a member's name, in brand red, with a little pop
// when clicked, and a tag saying whether you're friends (you follow each
// other) or they follow you. It changes straight away, then settles on what
// the server says. `onChange` gets the follow state to merge into the
// profile. Logged-out visitors are sent to log in, then back.
// `followLabel` renames "Follow" (the Notifications page says "Follow back"), and
// `showFollowsYou` can drop that tag where it goes without saying.
function FollowButton({ profileUser, onChange, followLabel = 'Follow', showFollowsYou = true }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [saving, setSaving] = useState(false)
  const [popping, setPopping] = useState(false)
  const [error, setError] = useState(null)

  const { isFollowing, followsYou, isFriend, followerCount = 0 } = profileUser

  const handleClick = async () => {
    if (!getCurrentUser()) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    if (saving) return

    const before = { isFollowing, isFriend, followerCount }
    setPopping(true)
    setSaving(true)
    setError(null)

    onChange({
      isFollowing: !isFollowing,
      isFriend: !isFollowing && followsYou,
      followerCount: followerCount + (isFollowing ? -1 : 1),
    })

    try {
      onChange(await (isFollowing ? unfollowUser : followUser)(profileUser._id))
    } catch (err) {
      onChange(before)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const tag = isFriend ? 'Friends' : followsYou && showFollowsYou ? 'Follows you' : null

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onAnimationEnd={() => setPopping(false)}
        aria-pressed={Boolean(isFollowing)}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
          popping ? 'motion-safe:animate-follow-pop' : ''
        } ${
          isFollowing
            ? 'border border-brand-red/70 bg-brand-red/10 text-brand-red hover:bg-brand-red/20'
            : 'border border-brand-red bg-brand-red text-white hover:border-brand-orange hover:bg-brand-orange'
        }`}
      >
        {isFollowing ? 'Unfollow' : followLabel}
      </button>

      {tag && (
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-white/60">
          {tag}
        </span>
      )}

      {error && <p className="w-full text-sm text-brand-red">{error}</p>}
    </>
  )
}

export default FollowButton
