import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import AnimatedNumber from '../AnimatedNumber'
import { genreColour, ratingCounts } from '../../utils/profileStats'

// The genres shown before "Expand".
const TOP_GENRES = 5

// While the ratings are expanded into half stars, the genres beside them
// show as many, so the two cards match.
const HALF_STAR_ROWS = ratingCounts([], true).length

// How long a bar takes to slide open or shut.
const ROW_SECONDS = 0.3

const card = 'rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm'

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

// A big stat card's value and label, with its Expand button on the right.
function StatHeading({ value, label, expand }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-2xl font-bold wrap-break-word text-brand-gold">{value}</p>
        <p className="mt-1 text-sm text-white/50">{label}</p>
      </div>
      {expand}
    </div>
  )
}

function ExpandButton({ open, onToggle, controls }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 transition-colors hover:border-brand-gold/60 hover:bg-white/10 hover:text-white"
    >
      {open ? 'Collapse' : 'Expand'}
    </button>
  )
}

// One bar: what it's for, how full it is next to the biggest (`max`), and
// how many films. A bar that Expand adds slides open and fades in, and
// slides shut and fades out when it's collapsed again (at once, with
// reduced motion). One that stays grows or shrinks to its new length, and
// its number counts to the new one.
function Bar({ label, title, count, max, colour, labelWidth }) {
  const reduce = useReducedMotion()

  return (
    <motion.li
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: reduce ? 0 : ROW_SECONDS, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-3 py-0.75 text-xs">
        <span className={`${labelWidth} shrink-0 truncate text-white/60`} title={title}>
          {label}
        </span>
        <span aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${max ? (count / max) * 100 : 0}%`, background: colour }}
          />
        </span>
        <span className="w-7 shrink-0 text-right font-medium text-white/80">
          <AnimatedNumber value={count} />
          <span className="sr-only"> {count === 1 ? 'film' : 'films'}</span>
        </span>
      </div>
    </motion.li>
  )
}

function maxCount(rows) {
  return Math.max(0, ...rows.map((row) => row.count))
}

// The bars of a stat card. The ones there from the start don't animate in.
function Bars({ id, label, children }) {
  return (
    <ul id={id} aria-label={label} className="mt-4">
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </ul>
  )
}

// The average, and how many films they've rated at each whole star (each
// rating rounded up). Expand (`open`) splits it into half stars, the half
// steps sliding open between the whole ones.
function RatingStat({ average, ratings, open, onToggle }) {
  const id = useId()
  const rows = ratingCounts(ratings, open)
  const max = maxCount(rows)

  return (
    <div className={card}>
      <StatHeading
        value={average != null ? `${average.toFixed(1)} / 5` : '—'}
        label="Average rating"
        expand={ratings.length > 0 && <ExpandButton open={open} onToggle={onToggle} controls={id} />}
      />

      <Bars id={id} label="Films by rating">
        {rows.map((row) => (
          <Bar
            key={row.stars}
            label={
              <>
                {row.stars} <span className="text-brand-gold">★</span>
              </>
            }
            title={`${row.stars} ${row.stars === 1 ? 'star' : 'stars'}`}
            count={row.count}
            max={max}
            colour="var(--color-brand-gold)"
            labelWidth="w-9"
          />
        ))}
      </Bars>
    </div>
  )
}

// The genre they've watched most, and how many films they've watched in
// each of their top five genres, or top ten while the ratings beside it are
// expanded (`besideHalfStars`). Expand shows every genre. Each bar has its
// own colour, round the colour wheel from green down to red.
function GenreStat({ genres, besideHalfStars }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const limit = besideHalfStars ? HALF_STAR_ROWS : TOP_GENRES
  const shown = open ? genres : genres.slice(0, limit)
  const max = maxCount(genres)

  return (
    <div className={card}>
      <StatHeading
        value={genres[0]?.genre ?? '—'}
        label="Most watched genre"
        expand={genres.length > limit && <ExpandButton open={open} onToggle={() => setOpen(!open)} controls={id} />}
      />

      {genres.length === 0 ? (
        <p className="mt-4 text-xs text-white/40">No films watched yet.</p>
      ) : (
        <Bars id={id} label="Films by genre">
          {shown.map((row, index) => (
            <Bar
              key={row.genre}
              label={row.genre}
              title={row.genre}
              count={row.count}
              max={max}
              colour={genreColour(index, genres.length)}
              labelWidth="w-24"
            />
          ))}
        </Bars>
      )}
    </div>
  )
}

function ProfileStats({ stats }) {
  const [ratingsOpen, setRatingsOpen] = useState(false)

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
      {/* Side by side, all three are always as tall as the tallest: when
          one is expanded, the others grow with it as its bars slide open. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Their reviews, on the page that lists them all. */}
        <Link
          to={`/users/${stats.userId}/films`}
          className={`${card} group flex flex-col transition-colors hover:border-brand-gold/40 hover:bg-white/10`}
        >
          <p className="text-2xl font-bold text-brand-gold">{stats.reviewCount}</p>
          <p className="mt-1 text-sm text-white/50">Reviews</p>
          <p className="mt-auto pt-4 text-xs font-medium text-white/40 transition-colors group-hover:text-brand-gold">
            Show all reviews →
          </p>
        </Link>

        <RatingStat
          average={stats.averageRating}
          ratings={stats.ratings}
          open={ratingsOpen}
          onToggle={() => setRatingsOpen(!ratingsOpen)}
        />

        <GenreStat genres={stats.genres} besideHalfStars={ratingsOpen} />
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
