import { useState } from 'react'
import { Link } from 'react-router-dom'

import ReviewCard from '../reviews/ReviewCard'
import MemberAvatar from '../profile/MemberAvatar'
import FollowButton from '../profile/FollowButton'
import { bannerLayerStyle } from '../../utils/bannerStyle'
import { timeAgo } from '../../utils/timeAgo'

// How many names a vote notification lists before "+N others".
const SHOWN_NAMES = 3

// Text that sits on the page's own background (the vote boxes and review
// boxes are see-through): light on the GIF and the purple, dark on white.
// Replies and follows carry the member's banner, so they stay light.
const TONES = {
  dark: {
    text: 'text-white/80',
    muted: 'text-white/40',
    name: 'font-semibold text-white transition-colors hover:text-brand-gold',
    button: 'text-brand-gold hover:text-white',
    like: 'text-emerald-300',
    dislike: 'text-red-300',
    reviewBox: 'border-white/10 bg-black/35',
    trendingBox: 'border-brand-gold/40 bg-brand-gold/15',
  },
  light: {
    text: 'text-ink/80',
    muted: 'text-ink/50',
    name: 'font-semibold text-ink transition-colors hover:text-brand-red',
    button: 'text-brand-red hover:text-ink',
    like: 'text-emerald-700',
    dislike: 'text-red-700',
    reviewBox: 'border-ink/10 bg-black/10',
    trendingBox: 'border-brand-gold/60 bg-brand-gold/25',
  },
}

// Likes come in a translucent green box, dislikes in a red one, in the
// same colours as the thumbs.
const VOTES = {
  like: {
    heading: 'Someone liked your review!',
    verb: 'liked',
    box: 'border-emerald-400/30 bg-emerald-500/10',
  },
  dislike: {
    heading: 'Someone disliked your review!',
    verb: 'disliked',
    box: 'border-red-400/30 bg-red-500/10',
  },
}

// The light glass behind new and trending reviews: blurred, but only a little.
const GLASS = 'backdrop-blur-[6px]'

function NameLink({ user, className }) {
  return (
    <Link to={`/users/${user._id}`} className={className}>
      {user.username}
    </Link>
  )
}

// "Ana", "Ana and Ben", "Ana, Ben and Cy", or with more to come
// ("+3 others" follows) "Ana, Ben, Cy". Each name links to their profile.
function Names({ people, more, className }) {
  return people.map((person, index) => {
    const last = index === people.length - 1
    const beforeLast = index === people.length - 2
    const separator = last ? '' : beforeLast && !more ? ' and ' : ', '

    return (
      <span key={person._id}>
        <NameLink user={person} className={className} />
        {separator}
      </span>
    )
  })
}

// Likes or dislikes on your review, grouped, in a green or red box: your
// review card on the left, who voted on the right, with the full list
// behind "See all".
function VoteNotice({ item, tone, solid }) {
  const [expanded, setExpanded] = useState(false)
  const vote = VOTES[item.type]
  const people = item.actors
  const others = Math.max(0, people.length - SHOWN_NAMES)

  return (
    <article className={`rounded-2xl border p-5 backdrop-blur-sm sm:p-6 ${vote.box}`}>
      <h2 className={`mb-4 text-sm font-semibold ${tone[item.type]}`}>{vote.heading}</h2>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="w-120 max-w-full shrink-0">
          <ReviewCard review={item.review} solid={solid} />
        </div>

        <div className="min-w-0">
          <p className={`text-lg leading-snug ${tone.text}`}>
            <Names people={people.slice(0, SHOWN_NAMES)} more={others > 0} className={tone.name} />
            {others > 0 && (
              <span className={tone.muted}>
                {' '}+{others} {others === 1 ? 'other' : 'others'}
              </span>
            )}{' '}
            {vote.verb} your review
          </p>
          <p className={`mt-1 text-xs ${tone.muted}`}>{timeAgo(item.at)}</p>

          {others > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              className={`mt-3 text-sm font-medium transition-colors ${tone.button}`}
            >
              {expanded ? 'Hide the list' : `See all ${people.length}`}
            </button>
          )}

          {expanded && (
            <ul className="mt-3 space-y-2">
              {people.map((person) => (
                <li key={person._id}>
                  <Link to={`/users/${person._id}`} className="flex items-center gap-3 text-sm">
                    <MemberAvatar user={person} size="sm" />
                    <span className={tone.name}>{person.username}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  )
}

// A new review from someone you follow, on light black glass, or a trending
// one from someone you don't, on translucent gold: a line saying which,
// then the review card in the middle.
function ReviewNotice({ item, tone, solid }) {
  const { review } = item
  const author = review.user
  const trending = item.type === 'trending'

  return (
    <article
      className={`rounded-2xl border p-5 sm:p-6 ${GLASS} ${trending ? tone.trendingBox : tone.reviewBox}`}
    >
      <div className={`mb-5 flex items-center gap-3 text-sm ${tone.text}`}>
        <MemberAvatar user={author} size="sm" />
        <p>
          {trending ? (
            <>
              <NameLink user={author} className={tone.name} />'s review of{' '}
              <Link to={`/films/${review.tmdbId}`} className={tone.name}>
                {review.filmTitle}
              </Link>{' '}
              is trending!
            </>
          ) : (
            <>
              <NameLink user={author} className={tone.name} /> posted a new review
            </>
          )}
          <span className={tone.muted}> · {timeAgo(item.at)}</span>
        </p>
      </div>

      <div className="mx-auto w-120 max-w-full">
        <ReviewCard review={review} solid={solid} />
      </div>
    </article>
  )
}

// A member's banner filling the box, darkened on the left so the text reads,
// for replies and new followers.
function BannerBackdrop({ user }) {
  return (
    <>
      <div className="absolute inset-0 -z-10" style={bannerLayerStyle(user.reviewCardBanner)} />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-ink/85 via-ink/60 to-ink/30" />
    </>
  )
}

const bannerNameClasses = 'font-semibold text-white transition-colors hover:text-brand-gold'

// Someone answered your review or comment: on their review card banner, what
// they said in a quote bubble, the film's poster on the right, and a link
// straight to the reply.
function ReplyNotice({ item }) {
  const { review, reply } = item
  const replier = item.actors[0]
  const replyLink = `/reviews/${review._id}#comment-${reply._id}`

  const posterUrl = review.posterPath
    ? `https://image.tmdb.org/t/p/w154${review.posterPath}`
    : null

  return (
    <article className="relative isolate overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40">
      <BannerBackdrop user={replier} />

      <div className="flex gap-5 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 text-sm text-white/80">
            <MemberAvatar user={replier} size="sm" />
            <p>
              <NameLink user={replier} className={bannerNameClasses} /> replied to your{' '}
              {reply.toComment ? 'comment' : 'review'} on{' '}
              <Link to={`/reviews/${review._id}`} className={bannerNameClasses}>
                {review.filmTitle}
              </Link>
            </p>
          </div>

          <blockquote className="mt-3 rounded-2xl rounded-tl-sm border border-white/10 bg-ink/70 px-4 py-3 text-sm leading-relaxed text-white/85 backdrop-blur-sm">
            <p className="line-clamp-3 whitespace-pre-line wrap-break-word">“{reply.text}”</p>
          </blockquote>

          <p className="mt-3 text-xs text-white/50">
            {timeAgo(item.at)} ·{' '}
            <Link to={replyLink} className="font-medium text-brand-gold transition-colors hover:text-white">
              View reply →
            </Link>
          </p>
        </div>

        <Link to={replyLink} className="shrink-0 self-center" aria-label={`View the reply on ${review.filmTitle}`}>
          <div className="aspect-2/3 w-20 overflow-hidden rounded-md border border-white/10 bg-ink/60 shadow-lg shadow-black/40 sm:w-24">
            {posterUrl ? (
              <img src={posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-white/40">
                {review.filmTitle}
              </div>
            )}
          </div>
        </Link>
      </div>
    </article>
  )
}

// Someone started following you: on their banner, who they are, and a
// button to follow them back. Unfollowing removes this from the Feed.
function FollowNotice({ item }) {
  const follower = item.actors[0]
  const [follow, setFollow] = useState({
    _id: follower._id,
    isFollowing: item.followingBack,
    followsYou: true,
    isFriend: item.followingBack,
  })

  return (
    <article className="relative isolate overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40">
      <BannerBackdrop user={follower} />

      <div className="flex flex-wrap items-center gap-4 p-5">
        <Link to={`/users/${follower._id}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
          <MemberAvatar user={follower} size="lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-white/80">
            <NameLink user={follower} className={bannerNameClasses} /> started following you
          </p>
          <p className="mt-0.5 text-xs text-white/50">
            {follower.memberTitle} · {timeAgo(item.at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FollowButton
            profileUser={follow}
            onChange={(change) => setFollow((previous) => ({ ...previous, ...change }))}
            followLabel="Follow back"
            showFollowsYou={false}
          />
        </div>
      </div>
    </article>
  )
}

// One notification on the Notifications page. `light` is for the white background:
// darker text, and solid review cards so they don't wash out.
function FeedItem({ item, light = false }) {
  const tone = light ? TONES.light : TONES.dark

  if (item.type === 'like' || item.type === 'dislike') return <VoteNotice item={item} tone={tone} solid={light} />
  if (item.type === 'reply') return <ReplyNotice item={item} />
  if (item.type === 'follow') return <FollowNotice item={item} />
  return <ReviewNotice item={item} tone={tone} solid={light} />
}

export default FeedItem
