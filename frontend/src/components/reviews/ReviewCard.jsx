import { useState } from 'react'
import { Link } from 'react-router-dom'
import StarRating from './StarRating'
import VoteButtons, { VoteBar } from './VoteButtons'
import { setReviewVote } from '../../services/films'
import { timeAgo } from '../../utils/timeAgo'
import { levelTextStyle } from '../../utils/levelStyle'
import { bannerLayerStyle } from '../../utils/bannerStyle'
import { RANK_TITLES, rankRing } from '../../utils/rankRings'

// showLevel keeps "Level: X" on screen, for the preview while editing the card.
// solid gives the card an opaque background, for a light page where the
// usual see-through one would wash out (the Notifications page on white).
function ReviewCard({ review, onVoteChange, showLevel = false, solid = false }) {
  const { user } = review

  // The profile's "No reviews yet" stand-in has no film, so there's nothing
  // to link to or vote on.
  const isPlaceholder = !review.tmdbId

  // A list that shows the same review twice (the marquee) keeps the votes
  // itself and passes onVoteChange, so both copies agree. Otherwise the card
  // remembers them.
  const [ownVotes, setOwnVotes] = useState(null)
  const votes = onVoteChange ? review : (ownVotes ?? review)

  // The top 3 on the Critics Leaderboard (Top), unless they've turned
  // "Ranking" off.
  const rank = user.showRank ? user.rank : null
  const ring = rankRing(rank)

  const posterUrl = review.posterPath
    ? `https://image.tmdb.org/t/p/w342${review.posterPath}`
    : null

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-white/10 text-white shadow-xl shadow-black/40 backdrop-blur-md ${
        solid ? 'bg-plum' : 'bg-plum/40'
      }`}
    >

      <div className="flex">
        <div className="relative aspect-2/3 w-40 shrink-0 bg-ink/60 sm:w-44">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={review.filmTitle}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-white/40">
              {review.filmTitle}
            </div>
          )}
        </div>

        {/* The poster sets the card's height (2:3 at its width), so it's never
            cropped and every card is the same height. contain-size keeps the text
            from making the row taller; the tallest case (two-line title, full
            review preview) still fits, and short titles leave the slack above "Read more".
            It's also a container, so the vote percentages hide when it's narrow. */}
        <div className="@container flex min-w-0 flex-1 flex-col p-5 contain-size">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-lg leading-tight font-semibold">
              {isPlaceholder ? review.filmTitle : (
                <Link
                  to={`/films/${review.tmdbId}`}
                  className="transition-colors hover:text-brand-gold"
                >
                  {review.filmTitle}
                </Link>
              )}{' '}
              {review.filmYear && (
                <span className="font-normal text-white/40">({review.filmYear})</span>
              )}
            </h3>
            <span className="shrink-0 text-xs text-white/40">
              {timeAgo(review.createdAt)}
            </span>
          </div>

          <div className="mb-3">
            <StarRating rating={review.rating} />
          </div>

          {review.containsSpoilers ? (
            <div className="relative">
              <p className="line-clamp-3 text-sm leading-relaxed text-white/70 blur-sm select-none sm:line-clamp-4">
                {review.text}
              </p>
              <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-brand-gold">
                Contains spoilers
              </p>
            </div>
          ) : (
            <p className="line-clamp-3 text-sm leading-relaxed text-white/70 sm:line-clamp-4">
              {review.text}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-4">
            {!isPlaceholder && (
              // The share of likes to dislikes, just under the buttons and as
              // wide as them. Positioned so it doesn't make the card taller.
              // Dislikes count as 0 when the author has PVP off.
              <div className="relative">
                <VoteButtons
                  likeCount={votes.likeCount ?? 0}
                  dislikeCount={votes.dislikeCount ?? 0}
                  myVote={votes.myVote ?? null}
                  send={(vote) => setReviewVote(review._id, vote)}
                  onChange={onVoteChange ?? setOwnVotes}
                  sharesClassName="hidden @3xs:inline"
                  allowDislikes={user.pvp}
                />

                <VoteBar
                  likeCount={votes.likeCount ?? 0}
                  dislikeCount={votes.dislikeCount ?? 0}
                  allowDislikes={user.pvp}
                  className="absolute inset-x-0 -bottom-1.5 overflow-hidden rounded-full"
                />
              </div>
            )}

            <Link
              to={`/reviews/${review._id}`}
              className="ml-auto text-sm font-medium text-brand-gold transition-colors hover:text-white"
            >
              Read more...
            </Link>
          </div>
        </div>
      </div>
      

      <div className="relative border-t border-white/10">
      
        <div
          className="absolute inset-0"
          style={bannerLayerStyle(user.reviewCardBanner)}
        />
      
        <div className="absolute inset-0 bg-linear-to-r from-ink/0 via-ink/40 to-ink/80" />

        <Link
          to={`/users/${user._id}`}
          className="group relative flex items-center justify-end gap-4 px-5 py-4"
        >
          <div className="text-right">
            <p className="font-semibold drop-shadow transition-colors group-hover:text-brand-gold">
              {user.username}
            </p>
            <p className="text-sm text-white/60">{user.memberTitle}</p>
          </div>

          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              title={RANK_TITLES[rank]}
              className={`peer h-12 w-12 rounded-full object-cover ${ring}`}
            />
          ) : (
            <div
              title={RANK_TITLES[rank]}
              className={`peer flex h-12 w-12 items-center justify-center rounded-full bg-brand-red font-bold ${ring}`}
            >
              {user.username[0].toUpperCase()}
            </div>
          )}

          {/* On the left of the banner, fading in while the avatar (the peer
              just before it) is hovered. */}
          {user.level != null && (
            <span
              className={`pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-lg leading-snug whitespace-nowrap transition-opacity duration-300 ${
                showLevel ? 'opacity-100' : 'opacity-0 peer-hover:opacity-100'
              }`}
              style={levelTextStyle(user.levelStyle)}
            >
              Level: {user.level}
            </span>
          )}
        </Link>
      </div>

    </article>
  )
}

export default ReviewCard