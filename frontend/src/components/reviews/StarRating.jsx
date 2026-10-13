const SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
}

function StarRating({ rating, size = 'lg', onLight = false }) {
  const sizeClass = SIZES[size] || SIZES.lg

  if (rating == null) {
    return (
      <p className={`${sizeClass} ${onLight ? 'text-ink/40' : 'text-white/40'}`}>
        Not rated
      </p>
    )
  }

  const percent = (rating / 5) * 100

  return (
    <div
      className={`relative inline-block leading-none ${sizeClass}`}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      <div className={onLight ? 'text-ink/15' : 'text-white/15'}>★★★★★</div>
      <div
        className="absolute inset-0 overflow-hidden whitespace-nowrap text-brand-gold"
        style={{ width: `${percent}%` }}
      >
        ★★★★★
      </div>
    </div>
  )
}

export default StarRating