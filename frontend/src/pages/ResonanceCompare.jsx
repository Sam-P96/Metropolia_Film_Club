import { useLayoutEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import PillToggle from '../components/PillToggle'
import MemberAvatar from '../components/profile/MemberAvatar'
import ResonanceIcon, { ResonanceMark } from '../components/resonance/ResonanceIcon'
import TasteDumbbell from '../components/resonance/TasteDumbbell'
import TasteRadar from '../components/resonance/TasteRadar'
import TasteScatter from '../components/resonance/TasteScatter'
import { SteadyText } from '../components/resonance/TasteParts'
import { DIFFERENCE, RATING_VIEWS, TRUE_DIFFERENCE, shiftOf, signedStars } from '../components/resonance/tasteChart'
import StarRating from '../components/reviews/StarRating'
import SortHeader from '../components/SortHeader'
import useApi from '../hooks/useApi'
import { getPairComparison, getResonanceWith } from '../services/resonance'
import { TIER_COLOURS } from '../utils/resonance'
import { RESONANCE_TIERS, resonanceTier } from '../../../shared/resonance.js'

// How far apart the two ratings are as Resonance counts them (the server's
// trueDifference), to one place, as it's shown.
const trueGap = (film) => Math.round(film.trueDifference * 10) / 10

// How each column sorts, and which way it goes when it's first clicked: A
// to Z for titles, the highest ratings first, and the closest first for
// how far apart the two ratings are. Ties go A to Z. The true difference
// sorts as it's shown, so films that look tied are.
const COLUMNS = {
  title: { first: 'asc' },
  mine: { first: 'desc', value: (film) => film.mine.rating },
  theirs: { first: 'desc', value: (film) => film.theirs.rating },
  difference: { first: 'asc', value: (film) => Math.abs(film.mine.rating - film.theirs.rating) },
  trueDifference: { first: 'asc', value: trueGap },
}

// An average rating, to one place: "3.4 ★".
const stars = (value) => `${value.toFixed(1)} ★`

function sortFilms(films, sortBy, sortDir) {
  const { value } = COLUMNS[sortBy]
  const sign = sortDir === 'asc' ? 1 : -1
  const byTitle = (a, b) => a.title.localeCompare(b.title)

  return [...films].sort((a, b) => sign * (value ? value(a) - value(b) : byTitle(a, b)) || byTitle(a, b))
}

// The comparison pages sit on a darker background: a black layer at 30%
// over the site's own, fixed behind the page like the games' backdrops
// (components/GameBackdrop.jsx) and running on past the bottom on a
// phone. It starts at the nav bar's bottom edge (measured, never touched),
// so the see-through nav bar looks just as it does on every other page.
function DarkerBackdrop() {
  const [top, setTop] = useState(0)

  useLayoutEffect(() => {
    const nav = document.querySelector('nav')
    if (!nav) return undefined
    const measure = () => setTop(Math.round(nav.getBoundingClientRect().height))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 bg-black/30 max-lg:-bottom-[10%]"
      style={{ top }}
    />
  )
}

// A message in place of the table.
function Notice({ children }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">{children}</div>
}

// One member's rating of a film, and their review of it, if they wrote one.
function Rating({ rating, reviewId }) {
  return (
    <>
      <StarRating rating={rating} size="sm" />
      {reviewId ? (
        <Link to={`/reviews/${reviewId}`} className="mt-1 block text-xs text-brand-gold transition-colors hover:text-white">
          Read review
        </Link>
      ) : (
        <span className="mt-1 block text-xs text-white/30">No review</span>
      )}
    </>
  )
}

// How far apart the two ratings are: "Same", or in stars, green when they
// agree and red when they're 2 or more apart.
function Difference({ film }) {
  const gap = Math.abs(film.mine.rating - film.theirs.rating)
  if (gap === 0) return <span className="text-emerald-300">Same</span>
  return <span className={gap >= 2 ? 'text-red-300' : 'text-white/70'}>{gap} ★</span>
}

// The difference Resonance counts: the two ratings each against its
// rater's own average, so a generous rater's 4.5 and a harsh one's 3.5 can
// be the same, but no gap at all when both gave the top or bottom rating,
// to one place, and how alike that makes them (the server works both out
// with Resonance's own settings: backend/utils/resonance.js filmGap).
// Green from a Soul Resonance's share up, red below a Resonance's.
function TrueDifference({ film }) {
  const gap = trueGap(film)
  const colour =
    film.similarity >= RESONANCE_TIERS.soul
      ? 'text-emerald-300'
      : film.similarity < RESONANCE_TIERS.resonance
        ? 'text-red-300'
        : 'text-white/70'

  return (
    <>
      <span className={colour}>{gap === 0 ? 'Same' : `${gap.toFixed(1)} ★`}</span>
      <span className="mt-1 block text-xs font-normal text-white/40">{film.similarity}% alike</span>
    </>
  )
}

// The film's poster, small, to its page.
function Poster({ film }) {
  return (
    // Out of the tab order: the title link in the same row goes to the same place.
    <Link
      to={`/films/${film.tmdbId}`}
      tabIndex={-1}
      aria-hidden="true"
      className="block h-16 w-11 overflow-hidden rounded bg-ink/60 transition-opacity hover:opacity-80"
    >
      {film.posterPath && (
        <img
          src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </Link>
  )
}

// Every film the logged-in member and another member have both rated, the
// two ratings side by side, from the score on that member's Resonance card.
// A table like a member's film list: each film goes to its page and each
// rating to the review with it, if there is one, and it sorts by title,
// either rating, or how far apart they are, as they stand or as Resonance
// counts them (the true difference). Only for someone they have a
// Resonance with and may see (the server checks). On a phone the number
// and poster columns go, and the table scrolls sideways if it must.
//
// At /SECRETresonance/:userA/:userB, from a pair's score there (moderators
// and admins: the server checks), it's any two members instead: userA's
// ratings where yours would be, and the score worked out now, as that
// list has it.
function ResonanceCompare() {
  const { userId, userA, userB } = useParams()
  const pair = Boolean(userA && userB)
  const { data, error, loading } = useApi(
    () => (pair ? getPairComparison(userA, userB) : getResonanceWith(userId)),
    [userId, userA, userB]
  )
  const [sortBy, setSortBy] = useState('title')
  const [sortDir, setSortDir] = useState('asc')

  const sort = (column) => {
    if (column === sortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir(COLUMNS[column].first)
    }
  }

  let content
  if (loading) {
    content = <p className="text-sm text-white/40">Loading…</p>
  } else if (!data) {
    const missing = error?.status === 404
    const notAllowed = pair && error?.status === 403
    let explanation = 'Something went wrong on our end. Try refreshing the page.'
    if (notAllowed) explanation = 'This page is for moderators and admins.'
    else if (missing) explanation = pair ? "One of these members isn't here any more." : 'You can compare your ratings with anyone you have a Resonance with.'
    content = (
      <Notice>
        <p className="font-medium">{missing || notAllowed ? 'Nothing to compare' : "Couldn't load this"}</p>
        <p className="mt-1 text-sm text-white/60">{explanation}</p>
      </Notice>
    )
  } else {
    content = <Comparison {...data} sortBy={sortBy} sortDir={sortDir} onSort={sort} />
  }

  return (
    <section className="text-white">
      <DarkerBackdrop />
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <Link
          to={pair ? '/SECRETresonance' : '/resonance'}
          className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
        >
          {pair ? "← Everyone's Resonance" : '← Your Resonance'}
        </Link>
        <div className="mt-3">{content}</div>
      </div>
    </section>
  )
}

// The page once it's loaded: who it's with and the score, the taste charts
// (every rating, by genre, and where they agree and disagree most), then
// the table. `first` is the first member of a /SECRETresonance pair, whose
// ratings are `mine`; without it, `mine` are the logged-in member's.
function Comparison({ first = null, match, averages, films, genres = [], sortBy, sortDir, onSort }) {
  // The charts: the ratings as given (Difference) or the true difference.
  const [view, setView] = useState(DIFFERENCE)
  const { user } = match
  const tier = resonanceTier(match.percent)
  const sorted = sortFilms(films, sortBy, sortDir)
  const header = { sortBy, sortDir, onSort }
  const cell = 'px-3 py-3 sm:px-4'
  const profileLink = (member) => (
    <Link to={`/users/${member._id}`} className="transition-colors hover:text-brand-gold">
      {member.username}
    </Link>
  )

  return (
    <>
      <div className="flex items-center gap-4">
        {first ? (
          <div className="flex shrink-0 -space-x-3">
            <MemberAvatar user={first} size="lg" />
            <MemberAvatar user={user} size="lg" />
          </div>
        ) : (
          <MemberAvatar user={user} size="lg" />
        )}
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-3xl font-bold sm:text-4xl">
            {first ? (
              <span className="truncate">
                {profileLink(first)}
                <span className="font-normal text-white/40"> and </span>
                {profileLink(user)}
              </span>
            ) : (
              <>
                <span className="truncate">
                  <span className="font-normal text-white/40">You and </span>
                  {profileLink(user)}
                </span>
                <ResonanceIcon userId={user._id} />
              </>
            )}
          </h1>
          <p className={`mt-1 flex items-center gap-2 text-lg font-bold ${TIER_COLOURS[tier.key]}`}>
            {tier.label}: {tier.shown}%
            {tier.key === 'soul' && <ResonanceMark />}
          </p>
        </div>
      </div>

      <div className="mt-4 mb-6 h-1 w-10 rounded-full bg-brand-gold" />

      {films.length === 0 ? (
        <Notice>
          <p className="font-medium">{first ? "They haven't" : "You haven't"} rated any of the same films yet.</p>
          <p className="mt-1 text-sm text-white/60">
            {first ? 'Their' : 'Your'} Resonance comes from the genres and ratings {first ? 'they' : 'you'} share, too.
          </p>
        </Notice>
      ) : (
        <>
          <div className="mb-6 max-w-2xl space-y-2 text-white/60">
            {first ? (
              <p>
                The {films.length} {films.length === 1 ? 'film' : 'films'} they've both rated, side by side, and
                their Resonance worked out now with the current weights, as Everyone's Resonance has it.
              </p>
            ) : (
              <p>
                The {films.length} {films.length === 1 ? 'film' : 'films'} you've both rated, side by side. Your
                Resonance is worked out again every night, so it may not count today's ratings yet.
              </p>
            )}
            <p>
              The true difference is the one Resonance counts: each rating against its rater's average (
              {first ? `${first.username}'s` : 'yours'} is {stars(averages.mine)}, {user.username}'s{' '}
              {stars(averages.theirs)}), so a generous rater and a harsh one who feel the same about a film come
              out the same. Both giving a film 5 stars, or both half a star, is always the same: neither of{' '}
              {first ? 'them' : 'you'} could go any further.
            </p>
          </div>

          <div className="mb-8 space-y-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <PillToggle options={RATING_VIEWS} value={view} onChange={setView} label="Charts show" />
              {/* Both notes take the same room, so toggling never moves the charts. */}
              <SteadyText
                className="min-w-0 flex-1 basis-64 text-xs text-white/55"
                shown={view}
                texts={{
                  [DIFFERENCE]: 'The star ratings as given.',
                  [TRUE_DIFFERENCE]: `${user.username}'s ratings moved ${signedStars(shiftOf(averages))} stars onto ${first ? `${first.username}'s` : 'your'} average, so how far apart two ratings sit is the true difference. Both at 5, or both at half a star, stay the same.`,
                }}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <TasteScatter films={films} theirName={user.username} myName={first?.username} view={view} averages={averages} />
              <TasteRadar genres={genres} theirName={user.username} myName={first?.username} view={view} averages={averages} />
            </div>
            <TasteDumbbell films={films} theirName={user.username} myName={first?.username} view={view} averages={averages} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <table className="w-full min-w-md border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="hidden w-12 px-4 py-3 text-xs font-semibold tracking-widest text-white/40 uppercase sm:table-cell">
                    #
                  </th>
                  <th className="hidden w-20 px-4 py-3 sm:table-cell">
                    <span className="sr-only">Poster</span>
                  </th>
                  <SortHeader label="Title" column="title" {...header} className={cell} />
                  <SortHeader
                    label={first ? <span className="max-w-28 truncate">{first.username}</span> : 'You'}
                    column="mine"
                    {...header}
                    className={`w-32 ${cell}`}
                  />
                  <SortHeader
                    label={<span className="max-w-28 truncate">{user.username}</span>}
                    column="theirs"
                    {...header}
                    className={`w-32 ${cell}`}
                  />
                  <SortHeader label="Difference" column="difference" {...header} className={`w-28 ${cell}`} />
                  <SortHeader
                    label="True difference"
                    column="trueDifference"
                    {...header}
                    className={`w-32 sm:whitespace-nowrap ${cell}`}
                  />
                </tr>
              </thead>

              <tbody>
                {sorted.map((film, index) => (
                  <tr
                    key={film.tmdbId}
                    className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                  >
                    <td className="hidden px-4 py-3 text-sm text-white/40 sm:table-cell">{index + 1}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Poster film={film} />
                    </td>
                    <td className={cell}>
                      <p className="font-medium text-white">
                        <Link to={`/films/${film.tmdbId}`} className="transition-colors hover:text-brand-gold">
                          {film.title}
                        </Link>{' '}
                        {film.year && <span className="font-normal text-white/40">({film.year})</span>}
                      </p>
                    </td>
                    <td className={cell}>
                      <Rating {...film.mine} />
                    </td>
                    <td className={cell}>
                      <Rating {...film.theirs} />
                    </td>
                    <td className={`${cell} text-sm font-semibold tabular-nums`}>
                      <Difference film={film} />
                    </td>
                    <td className={`${cell} text-sm font-semibold tabular-nums`}>
                      <TrueDifference film={film} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

export default ResonanceCompare
