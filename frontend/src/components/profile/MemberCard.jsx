import { Link } from 'react-router-dom'

import MemberAvatar from './MemberAvatar'

// Used by the members page and the search results page.
function MemberCard({ user }) {
  return (
    <Link
      to={`/users/${user._id}`}
      className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-brand-gold/40 hover:bg-white/10"
    >
      <MemberAvatar user={user} size="lg" />
      <div className="min-w-0">
        <p className="truncate font-semibold transition-colors group-hover:text-brand-gold">
          {user.username}
        </p>
        <p className="truncate text-sm text-white/50">{user.memberTitle}</p>
      </div>
    </Link>
  )
}

export default MemberCard
