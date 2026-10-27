function ProfileStats({ stats }) {
  const items = [
    {
      label: 'Reviews',
      value: stats.reviewCount,
    },
    {
      label: 'Average rating',
      value: stats.averageRating != null ? `${stats.averageRating.toFixed(1)} / 5` : '—',
    },
    {
      label: 'Most watched genre',
      value: stats.topGenre || '—',
    },
  ]

  // A second, thinner row: label and value on one line.
  const smallItems = [
    {
      label: 'Likes received',
      value: stats.likesReceived,
    },
    {
      label: 'Level',
      value: stats.level ?? '—',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
          >
            <p className="text-2xl font-bold text-brand-gold">{item.value}</p>
            <p className="mt-1 text-sm text-white/50">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {smallItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm"
          >
            <p className="text-sm text-white/50">{item.label}</p>
            <p className="text-lg font-bold text-brand-gold">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProfileStats
