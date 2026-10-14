import { useSearchParams } from 'react-router-dom'

import MemberCard from '../components/profile/MemberCard'
import { searchUsers } from '../utils/search'
import { getUsers } from '../services/users'
import useApi from '../hooks/useApi'

function Members() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const { data: users = [], loading, error } = useApi(getUsers, [])
  const matches = searchUsers(users, query)

  // The URL is the source of truth, so a filtered list can be shared or
  // reloaded. replace: true keeps every keystroke out of the back button.
  const handleChange = (e) => {
    const value = e.target.value
    setSearchParams(value ? { q: value } : {}, { replace: true })
  }

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">

        <h1 className="text-4xl font-bold sm:text-5xl">
          Club <span className="text-brand-gold">members</span>
        </h1>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search members..."
          aria-label="Search members"
          className="w-full max-w-md rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10"
        />

        {!loading && !error && (
          <p className="mt-4 text-sm text-white/50">
            {query.trim()
              ? `${matches.length} of ${users.length} members match “${query.trim()}”`
              : `${users.length} members`}
          </p>
        )}

        {loading || error || matches.length === 0 ? (
          <p className="mt-10 text-white/50">
            {loading
              ? 'Loading members…'
              : error
                ? "Couldn't load members. Try refreshing the page."
                : 'No members match that search.'}
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((user) => (
              <li key={user._id}>
                <MemberCard user={user} />
              </li>
            ))}
          </ul>
        )}

      </div>
    </section>
  )
}

export default Members
