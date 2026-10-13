import { useParams, Link } from 'react-router-dom'
import users from '../data/users'
import filmList from '../data/filmList'
import { getMembersWanting } from '../utils/watchlist'

// MINIMAL: this page currently shows only what the club's own data knows —
// the title, and who wants to see it. TMDB details, the review list and the
// average rating come later.
function FilmDetail() {
  const { tmdbId } = useParams()
  const id = Number(tmdbId)

  const anyEntry = filmList.find((entry) => entry.tmdbId === id)

  if (!anyEntry) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">Film not found</h1>
        <p className="mt-3 text-white/60">
          No one in the club has logged this film yet.
        </p>
      </section>
    )
  }

  const wanting = getMembersWanting(filmList, id).map((entry) => ({
    entry,
    user: users.find((user) => user._id === entry.userId),
  }))

  return (
    <section className="text-white">
      <div className="mx-auto max-w-3xl px-8 py-20">

        <h1 className="text-3xl font-bold">
          {anyEntry.title}{' '}
          <span className="font-normal text-white/40">({anyEntry.year})</span>
        </h1>

        <div className="mt-4 mb-10 h-1 w-10 rounded-full bg-brand-gold" />

        <h2 className="mb-5 text-sm font-semibold tracking-widest text-brand-gold uppercase">
          Who wants to see this
        </h2>

        {wanting.length === 0 ? (
          <p className="text-sm text-white/40">
            Nobody has this on their list right now.
          </p>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {wanting.map(({ entry, user }) => {
              if (!user) return null

              const isRewatch = entry.status === 'completed'

              return (
                <li key={entry._id}>
                  <Link
                    to={`/users/${user._id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/20"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-red text-sm font-bold ring-2 ring-white/20">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium transition-colors group-hover:text-brand-gold">
                        {user.username}
                      </p>
                      <p className="text-xs text-white/40">{user.memberTitle}</p>
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
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-10 rounded-xl border border-dashed border-white/15 px-5 py-4 text-sm text-white/30">
          Film details, member reviews and the club's average rating are coming to
          this page later.
        </p>

      </div>
    </section>
  )
}

export default FilmDetail