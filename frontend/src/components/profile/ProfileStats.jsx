import { Link } from 'react-router-dom'

const thinBox = 'flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm'

// A label and value on one line. With `to`, it's a link to more.
function ThinStat({ label, value, to }) {
  const content = (
    <>
      <p className="text-sm text-white/50">{label}</p>
      <p className="text-lg font-bold text-brand-gold">{value}</p>
    </>
  )

  return to ? (
    <Link to={to} className={`${thinBox} transition-colors hover:border-brand-gold/40 hover:bg-white/10`}>
      {content}
    </Link>
  ) : (
    <div className={thinBox}>{content}</div>
  )
}

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

  // A third row: who follows them and who they follow, opening the lists
  // unless their "Who can see your followers" setting keeps you out.
  const followItems = [
    { label: 'Followers', value: stats.followerCount ?? 0, kind: 'followers' },
    { label: 'Following', value: stats.followingCount ?? 0, kind: 'following' },
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
          <ThinStat key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {followItems.map((item) => (
          <ThinStat
            key={item.label}
            label={item.label}
            value={item.value}
            to={stats.canOpenFollows ? `/users/${stats.userId}/${item.kind}` : null}
          />
        ))}
      </div>
    </div>
  )
}

export default ProfileStats
