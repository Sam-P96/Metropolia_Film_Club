import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import ReviewCard from '../reviews/ReviewCard'
import { CutReplies } from '../reviews/ReviewComments'
import VoteButtons from '../reviews/VoteButtons'
import MemberAvatar from '../profile/MemberAvatar'
import FollowButton from '../profile/FollowButton'
import FarkleNotice from '../farkle/FarkleNotice'
import PayoutNotice from '../wallet/PayoutNotice'
import { bannerFillStyle, bannerFrameStyle, bannerLayerStyle } from '../../utils/bannerStyle'
import { getCurrentUser, getCurrentUserId } from '../../utils/currentUser'
import { formatEventDate, formatEventTime } from '../../utils/eventDates'
import { splitLinks } from '../../utils/links'
import { canDeleteAnyCut } from '../../utils/permissions'
import { timeAgo } from '../../utils/timeAgo'
import { resolveReports } from '../../services/films'
import { decidePasswordReset } from '../../services/passwordResets'
import { deleteCut, setCutVote } from '../../services/cuts'
import useCountdown, { formatCountdown } from '../../hooks/useCountdown'
import useDominantColor from '../../hooks/useDominantColor'

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

// With `fadeWhenTall`, a banner picture stops growing a little past half the
// screen's height: down to half it's as before, then it fades into its most
// common colour, which carries on down the rest of the box. The colour comes
// in as the picture goes, so a see-through picture's gaps stay see-through
// above that.
const PICTURE_FADE = 'linear-gradient(to bottom, black 50vh, transparent calc(50vh + 8rem))'
const COLOUR_FADE = 'linear-gradient(to bottom, transparent 50vh, black calc(50vh + 4rem))'

// A member's banner filling the box, darkened on the left so the text reads,
// for replies, new followers and cuts. A cover-sized picture grows with the
// box, so one that can get tall (a cut with its replies open) passes
// `fadeWhenTall` to keep it from stretching into a blurry close-up.
function BannerBackdrop({ user, fadeWhenTall = false }) {
  const banner = user.reviewCardBanner
  const fades = fadeWhenTall && banner?.type === 'image' && Boolean(banner.imageUrl)
  // Until it's worked out, or if the host won't let us read the picture,
  // the banner colour they picked.
  const dominant = useDominantColor(fades ? banner.imageUrl : null)

  return (
    <>
      {fades ? (
        <div className="absolute inset-0 -z-10 overflow-hidden" style={bannerFrameStyle(banner)}>
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: dominant ?? banner.color ?? '#2D1B47',
              maskImage: COLOUR_FADE,
              WebkitMaskImage: COLOUR_FADE,
            }}
          />
          <div
            className="absolute inset-x-0 top-0 h-full"
            style={{
              ...bannerFillStyle(banner),
              maxHeight: 'calc(50vh + 8rem)',
              maskImage: PICTURE_FADE,
              WebkitMaskImage: PICTURE_FADE,
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 -z-10" style={bannerLayerStyle(banner)} />
      )}
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

// How many likes make a cut a viral take. Matches VIRAL_LIKES in
// backend/utils/notify.js.
const VIRAL_LIKES = 5

// A member's cut: on their banner, who posted it, then what they wrote in a
// speech bubble, with any web addresses in it as links. Under it, its likes
// and dislikes (which don't count towards levels) and its replies, which
// open inside the card; `repliesOpen` has them open from the start with no
// toggle, as on the cut's own page. Its author, and moderators and admins,
// can delete it, which takes it out of everyone's Notifications; Delete
// asks first, right where the button was.
//
// A viral take (one with VIRAL_LIKES likes or more, which went out to every
// member) glows in brand gold and says so.
export function CutNotice({ item, onDeleted, repliesOpen = false }) {
  const { cut } = item
  const author = item.actors[0]
  const [currentUser] = useState(getCurrentUser)
  const yours = author._id === currentUser?._id
  const canDelete = yours || canDeleteAnyCut(currentUser)

  const [votes, setVotes] = useState({
    likeCount: cut.likeCount ?? 0,
    dislikeCount: cut.dislikeCount ?? 0,
    myVote: cut.myVote ?? null,
  })
  const [showReplies, setShowReplies] = useState(repliesOpen)
  const [replyCount, setReplyCount] = useState(cut.replyCount ?? 0)
  // Your like can be the one that makes it viral; the server marks it then.
  const viral = cut.viral || votes.likeCount >= VIRAL_LIKES

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      await deleteCut(cut._id)
      onDeleted(cut._id)
    } catch (err) {
      // 404: it's already gone, deleted somewhere else.
      if (err.status === 404) {
        onDeleted(cut._id)
        return
      }
      setError(err.message)
      setDeleting(false)
    }
  }

  const repliesLabel = showReplies
    ? 'Hide replies'
    : replyCount === 0
      ? 'Reply'
      : `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`

  return (
    <article
      className={`relative isolate overflow-hidden rounded-2xl ${
        viral
          ? 'border-2 border-brand-gold shadow-[0_0_28px_rgba(250,188,63,0.6)]'
          : 'border border-white/10 shadow-xl shadow-black/40'
      }`}
    >
      <BannerBackdrop user={author} fadeWhenTall />

      <div className="p-5 sm:p-6">
        {viral && (
          <p className="mb-3 text-xs font-semibold tracking-widest text-brand-gold uppercase">
            {yours ? 'Your cut went viral' : 'Viral take'}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-white/80">
          <Link to={`/users/${author._id}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
            <MemberAvatar user={author} size="md" />
          </Link>
          <p>
            {yours ? (
              'You posted your cut'
            ) : (
              <>
                <NameLink user={author} className={bannerNameClasses} /> posted their cut
              </>
            )}
            <span className="text-white/50"> · {timeAgo(item.at)}</span>
          </p>
        </div>

        <blockquote className="mt-4 rounded-2xl rounded-tl-sm border border-white/10 bg-ink/70 px-5 py-4 text-lg leading-relaxed text-white backdrop-blur-sm">
          <p className="whitespace-pre-line wrap-break-word">
            {splitLinks(cut.text).map((part, index) =>
              typeof part === 'string' ? (
                part
              ) : (
                <a
                  key={index}
                  href={part.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="font-medium break-all text-brand-gold underline underline-offset-2 transition-colors hover:text-white"
                >
                  {part.text}
                </a>
              )
            )}
          </p>
        </blockquote>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <VoteButtons
            {...votes}
            send={(vote) => setCutVote(cut._id, vote)}
            onChange={setVotes}
            subject="cut"
            allowDislikes={author.pvp}
          />

          {!repliesOpen && (
            <button
              type="button"
              onClick={() => setShowReplies(!showReplies)}
              aria-expanded={showReplies}
              className="font-medium text-white/60 transition-colors hover:text-brand-gold"
            >
              {repliesLabel}
            </button>
          )}

          {canDelete && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {confirming ? (
                <>
                  <span className="text-white/70">
                    Delete {yours ? 'your' : `${author.username}'s`} cut for everyone?
                  </span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md bg-brand-red px-3 py-1.5 font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="font-medium text-white/50 transition-colors hover:text-brand-red"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-right text-xs text-brand-red">{error}</p>}

        {showReplies && (
          <div className="mt-4 rounded-xl border border-white/10 bg-ink/75 p-4 backdrop-blur-sm sm:p-5">
            <CutReplies cutId={cut._id} onCountChange={setReplyCount} />
          </div>
        )}
      </div>
    </article>
  )
}

// Someone answered your cut, or your reply under one: on their banner, what
// they said in a quote bubble, the cut it's under, and a link to the reply
// on the cut's page.
function CutReplyNotice({ item }) {
  const { cut, reply } = item
  const replier = item.actors[0]
  const replyLink = `/cuts/${cut._id}#comment-${reply._id}`

  return (
    <article className="relative isolate overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40">
      <BannerBackdrop user={replier} />

      <div className="p-5">
        <div className="flex items-center gap-3 text-sm text-white/80">
          <MemberAvatar user={replier} size="sm" />
          <p>
            <NameLink user={replier} className={bannerNameClasses} /> replied to your{' '}
            {reply.toComment ? 'reply' : 'cut'}
          </p>
        </div>

        <blockquote className="mt-3 rounded-2xl rounded-tl-sm border border-white/10 bg-ink/70 px-4 py-3 text-sm leading-relaxed text-white/85 backdrop-blur-sm">
          <p className="line-clamp-3 whitespace-pre-line wrap-break-word">“{reply.text}”</p>
        </blockquote>

        <p className="mt-3 line-clamp-1 text-xs wrap-break-word text-white/50">On the cut: “{cut.text}”</p>

        <p className="mt-1 text-xs text-white/50">
          {timeAgo(item.at)} ·{' '}
          <Link to={replyLink} className="font-medium text-brand-gold transition-colors hover:text-white">
            View reply →
          </Link>
        </p>
      </div>
    </article>
  )
}

// The two looks an event notification takes. A club event is the homepage's
// Next Event as a white card with a glowing brand gold border; a member
// screening is the same on black glass with a plain brand gold border. `glass` is the screening's background, darker on
// the white page so its light text still reads.
const EVENT_LOOKS = {
  club: {
    box: 'border-2 border-brand-gold bg-white text-ink shadow-[0_0_28px_rgba(250,188,63,0.5)]',
    label: 'text-brand-red',
    body: 'text-ink/80',
    soft: 'text-ink/70',
    muted: 'text-ink/50',
    link: 'text-brand-red hover:text-brand-orange',
    title: 'hover:text-brand-red',
  },
  screening: {
    box: 'border border-brand-gold text-white backdrop-blur-[6px]',
    glass: { dark: 'bg-black/45', light: 'bg-black/75' },
    label: 'text-brand-gold',
    body: 'text-white/80',
    soft: 'text-white/70',
    muted: 'text-white/50',
    link: 'text-brand-gold hover:text-white',
    title: 'hover:text-brand-gold',
  },
}

// A new club event, or a member screening by someone you follow (yours say so),
// laid out like the homepage's Next Event: the details on the left, its GIF
// tilted on the right. It shows the event as it is now, edits included.
function EventNotice({ item, light }) {
  const { event } = item
  const host = item.actors[0] ?? null
  const screening = !event.official
  const yours = Boolean(host) && host._id === getCurrentUserId()
  const look = screening ? EVENT_LOOKS.screening : EVENT_LOOKS.club
  const eventLink = `/club_events/${event._id}`

  const label = screening
    ? yours ? 'Your member screening' : 'New member screening'
    : yours ? 'Your club event' : 'New club event'

  return (
    <article
      className={`rounded-2xl p-6 sm:p-8 ${look.box} ${
        screening ? `shadow-xl shadow-black/30 ${look.glass[light ? 'light' : 'dark']}` : ''
      }`}
    >
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
        <div className="min-w-0">
          <h2 className={`mb-3 text-sm font-semibold tracking-widest uppercase ${look.label}`}>
            {label}
          </h2>

          <h3 className="mb-5 text-2xl font-bold wrap-break-word sm:text-3xl">
            <Link to={eventLink} className={`transition-colors ${look.title}`}>
              {event.title}
            </Link>
          </h3>

          <div className={`mb-5 space-y-1 ${look.body}`}>
            <p className="font-medium">
              {formatEventDate(event.startsAt)} at {formatEventTime(event.startsAt)}
            </p>
            {event.location && <p>{event.location}</p>}
            {event.film && (
              <p>
                Film: <span className={`font-semibold ${look.label}`}>{event.film.title}</span>
              </p>
            )}
            {screening && (
              <p>
                Hosted by{' '}
                {yours ? (
                  'you'
                ) : host ? (
                  <Link to={`/users/${host._id}`} className={`font-semibold transition-colors ${look.title}`}>
                    {host.username}
                  </Link>
                ) : (
                  'a former member'
                )}
              </p>
            )}
          </div>

          {event.description && (
            <p className={`line-clamp-3 leading-relaxed ${look.soft}`}>{event.description}</p>
          )}

          <p className={`mt-5 text-sm ${look.muted}`}>
            <Link to={eventLink} className={`font-medium transition-colors ${look.link}`}>
              See the event →
            </Link>{' '}
            · posted {timeAgo(item.at)}
          </p>
        </div>

        {event.gifUrl && (
          <Link to={eventLink} tabIndex={-1} aria-hidden="true" className="block">
            <div className="-skew-x-6 overflow-hidden rounded-2xl shadow-xl shadow-black/20">
              <img
                src={event.gifUrl}
                alt=""
                loading="lazy"
                className="aspect-4/3 w-full skew-x-6 scale-115 object-cover"
              />
            </div>
          </Link>
        )}
      </div>
    </article>
  )
}

// How a member turning PvP on is announced, one picked at random for each
// notification (the server stores which). Nods to films and games. The
// server's PVP_LINES (backend/utils/notify.js) must match how many.
const PVP_LINES = [
  (name) => <>Here comes a new challenger: {name}!</>, // Street Fighter / Tekken
  (name) => <>{name}, may the power protect you.</>, // Power Rangers
  (name) => <>Are you not entertained? {name} has entered the arena!</>, // Gladiator
  (name) => <>This. Is. {name}! ! !</>, // 300
  (name) => <>May the odds be ever in {name}'s favour.</>, // The Hunger Games
  (name) => <>Rejoice. You have the privilege of being rated by {name}. You may think this is suffering... no. It is salvation. </>, // Infinity War
  (name) => <>War. War never changes. But {name} just did.</>, // Fallout
  (name) => <>{name} has entered the fray.</>, // Skyrim
  (name) => <>{name} is inevitable. Dread it. Run from it. Destiny arrives all the same.</>, // Avengers: Endgame
  (name) => <>{name} has stepped onto the battlefield!</>, // ???
]

// Someone turned PvP on: on their banner, inside a glowing red border, the
// line it's announced with, and plainly what happened. It goes again if
// they turn PvP off.
function PvpNotice({ item }) {
  const fighter = item.actors[0]
  const line = PVP_LINES[(item.variant ?? 0) % PVP_LINES.length]
  const name = <NameLink user={fighter} className={bannerNameClasses} />

  return (
    <article className="relative isolate overflow-hidden rounded-2xl border-2 border-brand-red shadow-[0_0_28px_rgba(199,37,62,0.6)]">
      <BannerBackdrop user={fighter} />

      <div className="flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <Link to={`/users/${fighter._id}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
          <MemberAvatar user={fighter} size="lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-widest text-red-300 uppercase">PvP enabled</p>
          <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">{line(name)}</h2>
          <p className="mt-1 text-sm text-white/70">
            {fighter.username} has enabled PvP: they can dislike reviews and comments, and theirs
            can be disliked.
            <span className="text-white/50"> · {timeAgo(item.at)}</span>
          </p>
        </div>
      </div>
    </article>
  )
}

// A reported review, pinned at the top of every moderator's and admin's
// Notifications: in a red box, the review card on the left, who reported it
// and when on the right. "Addressed" or "Dismiss" clears it for all of them.
export function ReportNotice({ report, light = false, onResolved }) {
  const tone = light ? TONES.light : TONES.dark
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)
  const count = report.reporters.length

  const resolve = async (status) => {
    setSaving(status)
    setError(null)

    try {
      await resolveReports(report._id, status)
      onResolved(report._id)
    } catch (err) {
      setError(err.message)
      setSaving(null)
    }
  }

  const buttonBase =
    'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60'

  return (
    <article className="rounded-2xl border border-red-400/60 bg-red-500/15 p-5 shadow-xl shadow-black/30 backdrop-blur-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-sm font-semibold tracking-widest uppercase ${tone.dislike}`}>
          Review reported{count > 1 ? ` · ${count} reports` : ''}
        </h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => resolve('addressed')}
            disabled={saving !== null}
            className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-500`}
          >
            {saving === 'addressed' ? 'Saving…' : 'Addressed'}
          </button>
          <button
            type="button"
            onClick={() => resolve('dismissed')}
            disabled={saving !== null}
            className={`${buttonBase} border ${
              light
                ? 'border-ink/20 bg-ink/5 text-ink hover:bg-ink/10'
                : 'border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10'
            }`}
          >
            {saving === 'dismissed' ? 'Saving…' : 'Dismiss'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="w-120 max-w-full shrink-0">
          <ReviewCard review={report.review} solid={light} />
        </div>

        <div className="min-w-0">
          <p className={`text-sm font-medium ${tone.text}`}>Reported by</p>
          <ul className="mt-2 space-y-2">
            {report.reporters.map((person) => (
              <li key={person._id} className="flex items-center gap-3 text-sm">
                <MemberAvatar user={person} size="sm" />
                <span>
                  <NameLink user={person} className={tone.name} />
                  <span className={tone.muted}> · {timeAgo(person.reportedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className={`mt-4 text-xs ${tone.muted}`}>
            Only moderators and admins see this. Addressed or Dismiss clears it for all of you.
          </p>
          {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
        </div>
      </div>
    </article>
  )
}

// A member asking for a password reset, pinned at the top of the
// Notifications of every moderator and admin who may decide it, in a gold
// box. Approve lets the member choose a new password; either button clears
// it for all of them. It leaves by itself when it times out (20 minutes).
export function PasswordResetNotice({ request, light = false, onResolved }) {
  const tone = light ? TONES.light : TONES.dark
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)
  const msLeft = useCountdown(request.expiresAt)
  const { user } = request

  useEffect(() => {
    if (msLeft === 0) onResolved(request._id)
  }, [msLeft, onResolved, request._id])

  const decide = async (decision) => {
    setSaving(decision)
    setError(null)

    try {
      await decidePasswordReset(request._id, decision)
      onResolved(request._id)
    } catch (err) {
      // 404: someone else decided it first, or it timed out. Either way it's gone.
      if (err.status === 404) {
        onResolved(request._id)
        return
      }
      setError(err.message)
      setSaving(null)
    }
  }

  const buttonBase =
    'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60'

  return (
    <article className="rounded-2xl border border-brand-gold/60 bg-brand-gold/15 p-5 shadow-xl shadow-black/30 backdrop-blur-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`text-sm font-semibold tracking-widest uppercase ${light ? 'text-amber-700' : 'text-brand-gold'}`}>
          Password reset request
        </h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide('approve')}
            disabled={saving !== null}
            className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-500`}
          >
            {saving === 'approve' ? 'Saving…' : 'Approve'}
          </button>
          <button
            type="button"
            onClick={() => decide('dismiss')}
            disabled={saving !== null}
            className={`${buttonBase} border ${
              light
                ? 'border-ink/20 bg-ink/5 text-ink hover:bg-ink/10'
                : 'border-white/20 bg-white/5 text-white hover:border-brand-gold/60 hover:bg-white/10'
            }`}
          >
            {saving === 'dismiss' ? 'Saving…' : 'Dismiss'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <MemberAvatar user={user} size="lg" />
        <div className="min-w-0">
          <p className={`text-lg ${tone.text}`}>
            <NameLink user={user} className={tone.name} /> has requested to change passwords
          </p>
          <p className={`mt-1 text-sm ${tone.muted}`}>
            {timeAgo(request.at)} · times out in {formatCountdown(msLeft)}
          </p>
        </div>
      </div>

      <p className={`mt-4 text-xs ${tone.muted}`}>
        Only approve it if you know {user.username} asked: whoever sent the request chooses the
        new password. Approve or Dismiss clears it for every moderator and admin.
      </p>
      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </article>
  )
}

// One notification on the Notifications page. `light` is for the white background:
// darker text, and solid review cards so they don't wash out. `onCutDeleted`
// gets the id of a cut deleted from here.
function FeedItem({ item, light = false, onCutDeleted }) {
  const tone = light ? TONES.light : TONES.dark

  if (item.type === 'like' || item.type === 'dislike') return <VoteNotice item={item} tone={tone} solid={light} />
  if (item.type === 'reply') return <ReplyNotice item={item} />
  if (item.type === 'follow') return <FollowNotice item={item} />
  if (item.type === 'pvp') return <PvpNotice item={item} />
  if (item.type === 'event') return <EventNotice item={item} light={light} />
  if (item.type === 'cut') return <CutNotice item={item} onDeleted={onCutDeleted} />
  if (item.type === 'cutReply') return <CutReplyNotice item={item} />
  if (item.type === 'payout') return <PayoutNotice item={item} light={light} />
  if (item.type.startsWith('farkle')) return <FarkleNotice item={item} />
  return <ReviewNotice item={item} tone={tone} solid={light} />
}

export default FeedItem
