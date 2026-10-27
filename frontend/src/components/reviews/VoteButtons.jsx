import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../../utils/currentUser'

// 999, then 1k, 1.2k, 12.5k… so the buttons stay small.
const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const formatCount = (count) => compactNumber.format(count).toLowerCase()

// Whole percentages that always add up to 100, or null before anyone votes.
function shares(likeCount, dislikeCount) {
  const total = likeCount + dislikeCount
  if (total === 0) return null

  const like = Math.round((likeCount / total) * 100)
  return { like, dislike: 100 - like }
}

// The counts once `myVote` changes to `vote`, to show before the server
// answers. The voter's dislike only counts while their PVP is on.
function afterVote({ likeCount, dislikeCount, myVote }, vote, dislikeCounts) {
  const dislikeStep = (vote === 'dislike' ? 1 : 0) - (myVote === 'dislike' ? 1 : 0)

  return {
    likeCount: likeCount + (vote === 'like' ? 1 : 0) - (myVote === 'like' ? 1 : 0),
    dislikeCount: dislikeCount + (dislikeCounts ? dislikeStep : 0),
    myVote: vote,
  }
}

// The same messages as backend/utils/pvp.js.
const pvpMessage = (subject) =>
  `To dislike a ${subject}, you need to turn on PVP in "Edit profile" on your profile page.`

const authorPvpMessage = (subject) =>
  `This member has PVP turned off, so their ${subject}s can't be disliked.`

const SIZES = {
  // Review cards and comments: no taller than the "Read more" link.
  sm: { button: 'h-5 gap-1 px-2 text-xs', icon: 12 },
  // The review page.
  md: { button: 'h-8 gap-1.5 px-3 text-sm', icon: 15 },
}

const KINDS = {
  like: {
    verb: 'Like',
    noun: ['like', 'likes'],
    chosen: 'border-emerald-400/70 text-emerald-300 hover:border-emerald-300',
  },
  dislike: {
    verb: 'Dislike',
    noun: ['dislike', 'dislikes'],
    chosen: 'border-red-400/70 text-red-300 hover:border-red-300',
  },
}

// Thumbs up and thumbs down, each with its count and share of the votes. A
// member has one vote or none: clicking the other thumb switches, clicking
// theirs again takes it back. It shows straight away, then settles on what
// the server says. Logged-out visitors are sent to log in, then back.
//
// Disliking needs PVP on, for the voter and the author; otherwise the thumbs
// down gives an alert saying why. Both buttons always show, so every card
// looks the same. With `allowDislikes` false (the author has PVP off) their
// dislikes count as 0, so the shares read as all liked.
//
// `send(vote)` saves 'like', 'dislike' or null and resolves to
// { likeCount, dislikeCount, myVote }. `onChange` gets each new state.
// `sharesClassName` can hide the percentages where space is short.
function VoteButtons({
  likeCount = 0,
  dislikeCount = 0,
  myVote = null,
  send,
  onChange,
  size = 'sm',
  subject = 'review',
  sharesClassName = '',
  allowDislikes = true,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [saving, setSaving] = useState(false)
  const [popping, setPopping] = useState(null)

  const goToLogin = () =>
    navigate('/login', { state: { from: location.pathname + location.search } })

  const counts = { like: likeCount, dislike: allowDislikes ? dislikeCount : 0 }
  const percent = shares(counts.like, counts.dislike)

  const handleClick = async (clicked) => {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      goToLogin()
      return
    }

    if (saving) return

    const before = { likeCount, dislikeCount, myVote }
    const vote = myVote === clicked ? null : clicked

    if (vote === 'dislike') {
      // Logins from before PVP existed don't know, so the server decides.
      if (currentUser.pvp === false) {
        window.alert(pvpMessage(subject))
        return
      }

      if (!allowDislikes) {
        window.alert(authorPvpMessage(subject))
        return
      }
    }

    onChange(afterVote(before, vote, currentUser.pvp !== false))
    setPopping(vote)
    setSaving(true)

    try {
      onChange(await send(vote))
    } catch (err) {
      onChange(before)
      if (err.status === 401) goToLogin()
      // PVP is off for them or the author.
      if (err.status === 403) window.alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {Object.entries(KINDS).map(([kind, text]) => {
        const chosen = myVote === kind
        const count = counts[kind]
        const share = percent ? `${percent[kind]}%` : null

        return (
          <button
            key={kind}
            type="button"
            onClick={() => handleClick(kind)}
            aria-pressed={chosen}
            aria-label={`${text.verb} this ${subject}: ${count} ${text.noun[count === 1 ? 0 : 1]}${
              share ? `, ${share}` : ''
            }`}
            className={`flex shrink-0 items-center rounded-full border font-medium tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold active:scale-95 ${
              SIZES[size].button
            } ${
              chosen
                ? `bg-[rgba(14,8,20,0.74)] ${text.chosen}`
                : 'border-white/20 bg-[rgba(14,8,20,0.62)] text-[#d8cfe3] hover:border-white/35 hover:text-white'
            }`}
          >
            <ThumbIcon
              down={kind === 'dislike'}
              filled={chosen}
              size={SIZES[size].icon}
              popping={popping === kind}
              onPopped={() => setPopping(null)}
            />

            <span>{formatCount(count)}</span>

            {share && (
              <span className={`opacity-60 ${sharesClassName}`}>· {share}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Lucide's thumbs-up. Thumbs-down is the same shape turned upside down.
function ThumbIcon({ down, filled, size, popping, onPopped }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${down ? 'rotate-180' : ''} ${
        popping ? 'motion-safe:animate-like-pop' : ''
      }`}
      onAnimationEnd={onPopped}
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  )
}

// A thin green and red line showing the share of likes and dislikes. Faint
// grey until someone votes. With `allowDislikes` false (the author has PVP
// off) dislikes count as 0, so any likes make it all green.
export function VoteBar({ likeCount = 0, dislikeCount = 0, allowDislikes = true, className = '' }) {
  const percent = shares(likeCount, allowDislikes ? dislikeCount : 0)

  return (
    <div
      role="img"
      aria-label={percent ? `${percent.like}% liked, ${percent.dislike}% disliked` : 'No votes yet'}
      className={`flex h-0.5 w-full bg-white/10 ${className}`}
    >
      {percent && (
        <>
          <div
            className="bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${percent.like}%` }}
          />
          <div className="flex-1 bg-red-500" />
        </>
      )}
    </div>
  )
}

export default VoteButtons
