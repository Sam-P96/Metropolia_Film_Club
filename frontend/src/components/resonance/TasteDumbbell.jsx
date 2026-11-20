import { Link } from 'react-router-dom'

import { NoFilmsInCommon, TasteCard, TasteLegend } from './TasteParts'
import {
  DIFFERENCE,
  THEM_COLOUR,
  TRUE_DIFFERENCE,
  YOU_COLOUR,
  oneDecimal,
  posterUrl,
  shiftOf,
  shownTheirs,
  starScale,
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
// the track (`mine`, and `theirs` as shown), my dot and their ring joined
// by a line (a dot in a ring when they're the same), and the two numbers.
// On a phone the title sits above the track.
function Row({ film, mine, theirs, scale, names }) {
  const poster = posterUrl(film.posterPath)
  const xOf = (stars) => TRACK.inset + scale.share(stars) * (TRACK.width - 2 * TRACK.inset)

  return (
    <li className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:gap-4">
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
          aria-label={`${film.title}: ${names.mine} ${oneDecimal(mine)} stars, ${names.theirLegend} ${oneDecimal(theirs)} stars, from ${oneDecimal(scale.min)} to ${oneDecimal(scale.max)}.`}
        >
          <line x1={xOf(scale.min)} y1={MID} x2={xOf(scale.max)} y2={MID} stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
          {scale.steps.filter(Number.isInteger).map((stars) => (
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
    </li>
  )
}

function Section({ title, rows, scale, names, empty }) {
  return (
    <section className="min-w-0">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      {rows.length === 0 ? (
        <p className="py-3 text-sm text-white/60">{empty}</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {rows.map((row) => (
            <Row key={row.film.tmdbId} {...row} scale={scale} names={names} />
          ))}
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
// theirs moved by the gap between the two `averages`, the comparison's).
// `myName` is only for a /SECRETresonance pair, in place of "You".
export default function TasteDumbbell({ films, theirName, limit = 5, myName, view = DIFFERENCE, averages }) {
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
  const rowsOf = (list) =>
    list.map((film) => ({ film, mine: film.mine.rating, theirs: shownTheirs(film.mine.rating, film.theirs.rating, view, shift) }))
  const agreed = rowsOf(mostAgreed(films, limit, view))
  const apart = rowsOf(biggestDisagreements(films, limit, view))
  // One scale for every row, so the tracks line up.
  const scale = starScale([...agreed, ...apart].flatMap((row) => [row.mine, row.theirs]))

  return (
    <TasteCard title="Agree and disagree" legend={legend}>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Section title="Most agreed" rows={agreed} scale={scale} names={names} empty="" />
        <Section
          title="Biggest disagreements"
          rows={apart}
          scale={scale}
          names={names}
          empty={`No disagreements: ${names.both} rate every shared film the same.`}
        />
      </div>
    </TasteCard>
  )
}
