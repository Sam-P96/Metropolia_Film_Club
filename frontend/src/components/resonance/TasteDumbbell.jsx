import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { NoFilmsInCommon, TasteCard, TasteLegend } from './TasteParts'
import {
  DIFFERENCE,
  THEM_COLOUR,
  TRUE_DIFFERENCE,
  VIEW_CHANGE,
  YOU_COLOUR,
  easedScale,
  movedTheirs,
  oneDecimal,
  posterUrl,
  shiftOf,
  useViewProgress,
  whoIsWho,
} from './tasteChart'

// Each row's track, in its own units: the star scale across.
const TRACK = { width: 300, height: 28, inset: 10 }
const MID = TRACK.height / 2

const combined = (film) => film.mine.rating + film.theirs.rating

// How far apart a film's two ratings are in `view`: as given, or the true
// difference Resonance counts.
const gapOf = (film, view) => (view === TRUE_DIFFERENCE ? film.trueDifference : Math.abs(film.mine.rating - film.theirs.rating))

// The films they agree on most: the smallest gap first, the higher their
// two ratings together on a tie.
function mostAgreed(films, limit, view) {
  return [...films]
    .sort((a, b) => gapOf(a, view) - gapOf(b, view) || combined(b) - combined(a) || a.title.localeCompare(b.title))
    .slice(0, limit)
}

// The films they disagree on most: the largest gap first. Films with none
// aren't a disagreement at all.
function biggestDisagreements(films, limit, view) {
  return films
    .filter((film) => gapOf(film, view) > 0)
    .sort((a, b) => gapOf(b, view) - gapOf(a, view) || a.title.localeCompare(b.title))
    .slice(0, limit)
}

// One film: its poster and title (to its page), then the two ratings on
// the track (`mine`, and `theirs` as shown now), my dot and their ring
// joined by a line (a dot in a ring when they're the same), and the two
// numbers. On a phone the title sits above the track. When the view
// changes the ring glides along the track (the numbers counting with it),
// and a row that changes place slides to it.
function Row({ film, mine, theirs, scale, names, still }) {
  const poster = posterUrl(film.posterPath)
  const xOf = (stars) => TRACK.inset + scale.share(stars) * (TRACK.width - 2 * TRACK.inset)

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={still ? { duration: 0 } : VIEW_CHANGE}
      className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 items-center gap-3 sm:w-56 sm:shrink-0">
        <span className="block h-11 w-7 shrink-0 overflow-hidden rounded-sm bg-white/10" aria-hidden="true">
          {poster && <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </span>
        <p className="min-w-0 text-sm">
          <Link to={`/films/${film.tmdbId}`} className="font-medium text-white transition-colors hover:text-brand-gold">
            {film.title}
          </Link>
          {film.year && <span className="text-white/40"> ({film.year})</span>}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <svg
          viewBox={`0 0 ${TRACK.width} ${TRACK.height}`}
          className="block h-auto min-w-0 flex-1"
          role="img"
          aria-label={`${film.title}: ${names.mine} ${oneDecimal(mine)} stars, ${names.theirLegend} ${oneDecimal(theirs)} stars.`}
        >
          <line x1={xOf(scale.min)} y1={MID} x2={xOf(scale.max)} y2={MID} stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
          {scale.steps.filter((stars) => Number.isInteger(stars) && scale.shows(stars)).map((stars) => (
            <line key={stars} x1={xOf(stars)} y1={MID - 4} x2={xOf(stars)} y2={MID + 4} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          ))}
          <line x1={xOf(mine)} y1={MID} x2={xOf(theirs)} y2={MID} stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={xOf(theirs)} cy={MID} r="7" fill="#0B0710" stroke={THEM_COLOUR} strokeWidth="2.5" />
          <circle cx={xOf(mine)} cy={MID} r="4.5" fill={YOU_COLOUR} />
        </svg>
        {/* Wide enough for "4.5 · 4.9" on one line, so the toggle never changes a row's height. */}
        <span className="w-20 shrink-0 text-right text-sm font-semibold whitespace-nowrap tabular-nums" aria-hidden="true">
          <span style={{ color: YOU_COLOUR }}>{oneDecimal(mine)}</span>
          <span className="text-white/40"> · </span>
          <span style={{ color: THEM_COLOUR }}>{oneDecimal(theirs)}</span>
        </span>
      </div>
    </motion.li>
  )
}

// One of the two lists. It's `relative` so a row leaving it fades out
// where it was, lifted out of the list while the rest close up.
function Section({ title, rows, scale, names, empty, still }) {
  return (
    <section className="min-w-0">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      {rows.length === 0 ? (
        <p className="py-3 text-sm text-white/60">{empty}</p>
      ) : (
        <ul className="relative divide-y divide-white/5">
          <AnimatePresence mode="popLayout" initial={false}>
            {rows.map((row) => (
              <Row key={row.film.tmdbId} {...row} scale={scale} names={names} still={still} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}

// The films they agree on most and the ones they disagree on most, up to
// `limit` of each, every one's two ratings side by side on a track.
// `films` is the comparison's films (services/resonance.js
// getResonanceWith), `theirName` the other member's name. `view` is
// DIFFERENCE (the star ratings as given, ranked by how far apart they
// are; the default) or TRUE_DIFFERENCE (ranked by the true difference,
// theirs moved by the gap between the two `averages`, the comparison's);
// changing it, everything glides into place. `myName` is only for a
// /SECRETresonance pair, in place of "You".
export default function TasteDumbbell({ films, theirName, limit = 5, myName, view = DIFFERENCE, averages }) {
  const progress = useViewProgress(view)
  const still = useReducedMotion()
  const names = whoIsWho(theirName, myName)
  const legend = <TasteLegend mine={names.mine} theirs={names.theirLegend} />

  if (!films?.length) {
    return (
      <TasteCard title="Agree and disagree" legend={legend}>
        <NoFilmsInCommon />
      </TasteCard>
    )
  }

  const shift = shiftOf(averages)
  const theirsAt = (film, at) => movedTheirs(film.mine.rating, film.theirs.rating, at, shift)
  // One scale for every row, from every film, so the tracks line up and
  // stay put as rows come and go.
  const scale = easedScale(
    films.flatMap((film) => [film.mine.rating, film.theirs.rating]),
    films.flatMap((film) => [film.mine.rating, theirsAt(film, 1)]),
    progress
  )
  const rowsOf = (list) => list.map((film) => ({ film, mine: film.mine.rating, theirs: theirsAt(film, progress) }))

  return (
    <TasteCard title="Agree and disagree" legend={legend}>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Section title="Most agreed" rows={rowsOf(mostAgreed(films, limit, view))} scale={scale} names={names} empty="" still={still} />
        <Section
          title="Biggest disagreements"
          rows={rowsOf(biggestDisagreements(films, limit, view))}
          scale={scale}
          names={names}
          still={still}
          empty={`No disagreements: ${names.both} rate every shared film the same.`}
        />
      </div>
    </TasteCard>
  )
}
