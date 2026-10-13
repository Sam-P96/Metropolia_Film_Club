import { Link } from 'react-router-dom'
import filmList from '../../data/filmList'
import { getMembersWanting, describeOthersWanting } from '../../utils/watchlist'

function Watchlist({ entries, profileUserId, username, isOwner }) {
  if (!entries || entries.length === 0) {
    return (
      <p className="text-sm text-white/40">
        {isOwner
          ? "You haven't added anything you want to watch yet."
          : `${username} hasn't added anything to their list yet.`}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      {entries.map((entry) => {
        const others = getMembersWanting(filmList, entry.tmdbId, profileUserId).length
        const isRewatch = entry.status === 'completed'

        return (
          <li key={entry._id}>
            <Link
              to={`/films/${entry.tmdbId}`}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white transition-colors group-hover:text-brand-gold">
                  {entry.title}{' '}
                  <span className="font-normal text-white/40">({entry.year})</span>
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  {describeOthersWanting(others)}
                </p>
              </div>

              <span
                className={
                  isRewatch
                    ? 'shrink-0 rounded border border-brand-orange/50 px-2 py-0.5 text-[10px] tracking-wide text-brand-orange uppercase'
                    : 'shrink-0 rounded border border-brand-gold/50 px-2 py-0.5 text-[10px] tracking-wide text-brand-gold uppercase'
                }
              >
                {isRewatch ? 'Rewatch' : 'Watch'}
              </span>

              <span className="shrink-0 text-white/20 transition-colors group-hover:text-brand-gold">
                →
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export default Watchlist