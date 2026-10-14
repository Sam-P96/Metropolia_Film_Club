const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

// The uploaded picture, or the first letter of the username on brand red.
function MemberAvatar({ user, size = 'md' }) {
  const sizeClasses = SIZES[size] ?? SIZES.md

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={`${sizeClasses} shrink-0 rounded-full object-cover ring-2 ring-white/20`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full bg-brand-red font-bold text-white ring-2 ring-white/20`}
    >
      {user.username[0].toUpperCase()}
    </div>
  )
}

export default MemberAvatar
