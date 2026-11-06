import { Link } from 'react-router-dom'
import MemberAvatar from '../profile/MemberAvatar'
import CoinIcon from '../wallet/CoinIcon'
import { points } from '../../utils/loanShark'

// The boxes on the Loan Shark page: dark black glass over the page's
// purple-to-deep-sea background, like the other games.
export const GLASS = 'rounded-2xl border border-white/10 bg-ink/60 shadow-xl shadow-black/40 backdrop-blur-xl'

export const INPUT =
  'w-full min-w-0 rounded-lg border border-white/15 bg-ink/70 px-3 py-2 text-white tabular-nums placeholder:text-white/30 focus:border-brand-gold focus:outline-none'

export const BUTTON =
  'rounded-lg bg-brand-gold px-4 py-2 font-semibold text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40'

export const QUIET_BUTTON =
  'rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:border-brand-gold hover:text-white disabled:cursor-not-allowed disabled:opacity-40'

export const HEADING = 'text-xs font-semibold tracking-widest text-white/50 uppercase'

// A member's picture and name, linking to their profile. Members who have
// left show as "A former member", with no link.
export function Member({ user, size = 'sm', className = '' }) {
  if (!user?._id) return <span className={`text-white/60 ${className}`}>{user?.username ?? 'A former member'}</span>

  return (
    <Link to={`/users/${user._id}`} className={`inline-flex min-w-0 items-center gap-2 font-semibold text-white hover:text-brand-gold ${className}`}>
      <MemberAvatar user={user} size={size} />
      <span className="truncate">{user.username}</span>
    </Link>
  )
}

// A name as a link, inline in a sentence.
export function Name({ user }) {
  if (!user?._id) return <span className="font-semibold text-white/70">{user?.username ?? 'A former member'}</span>
  return (
    <Link to={`/users/${user._id}`} className="font-semibold text-brand-gold hover:text-white">
      {user.username}
    </Link>
  )
}

// "40 PP" or "40 P-PP", with its coin.
export function Amount({ value, kind = 'pp', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${className}`}>
      <CoinIcon kind={kind} size={15} />
      {points(value)}
    </span>
  )
}

// What a form or button said back: the error in red, or what happened.
export function Feedback({ message }) {
  if (!message) return null
  return (
    <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-red-300' : 'text-emerald-300'}`}>
      {message.text}
    </p>
  )
}
