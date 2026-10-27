import { RANK_TITLES, rankRing } from '../../utils/rankRings'

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

// The uploaded picture, or the first letter of the username on brand red.
// `rank` 1, 2 or 3 gives it a gold, silver or bronze ring.
function MemberAvatar({ user, size = 'md', rank = null }) {
  const sizeClasses = SIZES[size] ?? SIZES.md
  const ring = rankRing(rank)

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        title={RANK_TITLES[rank]}
        className={`${sizeClasses} shrink-0 rounded-full object-cover ${ring}`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      title={RANK_TITLES[rank]}
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full bg-brand-red font-bold text-white ${ring}`}
    >
      {user.username[0].toUpperCase()}
    </div>
  )
}

export default MemberAvatar
