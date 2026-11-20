import { ChartTip, TasteCard, TasteLegend } from './TasteParts'
import {
  DIFFERENCE,
  THEM_COLOUR,
  TRUE_DIFFERENCE,
  VIEW_CHANGE,
  YOU_COLOUR,
  easedScale,
  filmCount,
  oneDecimal,
  shiftOf,
  signedStars,
  useChartTip,
  useViewProgress,
  whoIsWho,
} from './tasteChart'

// Rings fade as they come onto the scale or leave it, in step with the movement.
const FADE = `opacity ${VIEW_CHANGE.duration}s ease`

// The chart, in its own units: wide enough for the genre names either side.
const WIDTH = 400
const HEIGHT = 340
const CX = WIDTH / 2
const CY = HEIGHT / 2
const RADIUS = 105
// How far out the genre names sit.
const LABEL_AT = RADIUS + 16

// The genres shown, and the fewest worth drawing a shape for.
const MOST_GENRES = 6
const FEWEST_GENRES = 3

// Corner `index` of `count`, the first straight up, going clockwise, and
// the point `distance` out along it.
const angleOf = (index, count) => -Math.PI / 2 + (index * 2 * Math.PI) / count
const pointAt = (index, count, distance) => [CX + Math.cos(angleOf(index, count)) * distance, CY + Math.sin(angleOf(index, count)) * distance]
const polygon = (points) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

// The genres with the most ratings between them, up to six.
function topGenres(genres) {
  return [...genres]
    .sort((a, b) => b.mine.count + b.theirs.count - (a.mine.count + a.theirs.count) || a.genre.localeCompare(b.genre))
    .slice(0, MOST_GENRES)
}

// How each of them rates the genres both have rated enough films in: their
// average star rating there, one shape each over the same corners (theirs
// dashed), the lowest rating in the middle to 5 at the edge. The six
// genres with the most ratings between them; nothing at all with fewer
// than three. A corner shows its numbers on hover, or on a tap. `genres`
// is the comparison's genres (services/resonance.js getResonanceWith),
// `theirName` the other member's name. `view` is DIFFERENCE (the averages
// as they are, the default) or TRUE_DIFFERENCE (theirs moved by the gap
// between the two overall `averages`, the comparison's, as the true
// difference counts them). `myName` is only for a /SECRETresonance pair,
// in place of "You".
export default function TasteRadar({ genres, theirName, myName, view = DIFFERENCE, averages }) {
  const { tip, tipTarget } = useChartTip()
  const progress = useViewProgress(view)
  const names = whoIsWho(theirName, myName)

  if (!genres || genres.length < FEWEST_GENRES) return null

  const moved = view === TRUE_DIFFERENCE
  const shift = shiftOf(averages)
  // Theirs `progress` of the way to moved, so the dashed shape eases there.
  const top = topGenres(genres)
  const shown = top.map((entry) => ({ ...entry, mineShown: entry.mine.average, theirsShown: entry.theirs.average + progress * shift }))
  const count = shown.length
  const scale = easedScale(
    top.flatMap((entry) => [entry.mine.average, entry.theirs.average]),
    top.flatMap((entry) => [entry.mine.average, entry.theirs.average + shift]),
    progress
  )
  // Every whole star either scale rings, each shown while it's on the scale.
  const rings = scale.steps.filter((stars) => Number.isInteger(stars))
  const ringShows = (stars) => stars > scale.min + 1e-6 && scale.shows(stars)
  const starPoint = (index, stars) => pointAt(index, count, scale.share(stars) * RADIUS)
  const mine = shown.map((entry, index) => starPoint(index, entry.mineShown))
  const theirs = shown.map((entry, index) => starPoint(index, entry.theirsShown))
  const active = shown.findIndex((entry) => entry.genre === tip)
  const summary = shown
    .map((entry) => `${entry.genre}: ${names.mine} ${oneDecimal(entry.mineShown)}, ${names.theirLegend} ${oneDecimal(entry.theirsShown)}`)
    .join('; ')

  return (
    <TasteCard title="By genre" legend={<TasteLegend mine={names.mine} theirs={names.theirLegend} dashed />}>
      <div className="relative mx-auto w-full max-w-md">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full select-none"
          role="group"
          aria-label={`Radar chart of average star ratings by genre for ${names.both}${moved ? `, ${theirName}'s moved ${signedStars(shift)} stars onto ${names.my} average (the true difference)` : ''}, from ${oneDecimal(scale.min)} in the middle to ${oneDecimal(scale.max)} at the edge. ${summary}.`}
        >
          {/* The rings, at every whole star, and their numbers up the top spoke. */}
          {rings.map((stars) => (
            <polygon
              key={stars}
              points={polygon(shown.map((_, index) => starPoint(index, Math.max(stars, scale.min))))}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              opacity={ringShows(stars) ? 1 : 0}
              style={{ transition: FADE }}
            />
          ))}
          {rings.map((stars) => (
            <text
              key={`ring-${stars}`}
              x={CX + 4}
              y={CY - Math.max(0, scale.share(stars)) * RADIUS - 2}
              fontSize="8"
              fill="rgba(255,255,255,0.35)"
              opacity={ringShows(stars) ? 1 : 0}
              style={{ transition: FADE }}
            >
              {stars}
            </text>
          ))}
          {shown.map((entry, index) => {
            const [x, y] = pointAt(index, count, RADIUS)
            return (
              <line
                key={`spoke-${entry.genre}`}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke={index === active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}
                strokeWidth="1"
              />
            )
          })}

          {/* Theirs dashed, mine solid over it. */}
          <polygon points={polygon(theirs)} fill={THEM_COLOUR} fillOpacity="0.14" stroke={THEM_COLOUR} strokeWidth="2" strokeDasharray="6 4" strokeLinejoin="round" />
          <polygon points={polygon(mine)} fill={YOU_COLOUR} fillOpacity="0.2" stroke={YOU_COLOUR} strokeWidth="2" strokeLinejoin="round" />
          {theirs.map(([x, y], index) => (
            <circle key={`theirs-${shown[index].genre}`} cx={x} cy={y} r="3.5" fill="#0B0710" stroke={THEM_COLOUR} strokeWidth="2" />
          ))}
          {mine.map(([x, y], index) => (
            <circle key={`mine-${shown[index].genre}`} cx={x} cy={y} r="3" fill={YOU_COLOUR} />
          ))}

          {/* Each corner: its genre, and a target for hovering or tapping. */}
          {shown.map((entry, index) => {
            const [x, y] = pointAt(index, count, LABEL_AT)
            const cos = Math.cos(angleOf(index, count))
            const sin = Math.sin(angleOf(index, count))
            const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
            const baseline = sin < -0.5 ? 'auto' : sin > 0.5 ? 'hanging' : 'middle'
            const [hitX, hitY] = pointAt(index, count, RADIUS + 4)
            return (
              <g
                key={`corner-${entry.genre}`}
                {...tipTarget(entry.genre)}
                aria-label={`${entry.genre}: ${names.mine} ${oneDecimal(entry.mineShown)} from ${filmCount(entry.mine.count)}, ${names.theirs} ${oneDecimal(entry.theirsShown)} from ${filmCount(entry.theirs.count)}`}
                className="cursor-pointer outline-none"
              >
                <circle cx={hitX} cy={hitY} r="22" fill="transparent" />
                <text
                  x={x}
                  y={y}
                  textAnchor={anchor}
                  dominantBaseline={baseline}
                  fontSize="11"
                  fontWeight={index === active ? 700 : 500}
                  fill={index === active ? '#fff' : 'rgba(255,255,255,0.8)'}
                >
                  {entry.genre}
                </text>
              </g>
            )
          })}
        </svg>

        {active >= 0 && (
          <ChartTip x={pointAt(active, count, RADIUS)[0]} y={pointAt(active, count, RADIUS)[1]} width={WIDTH} height={HEIGHT} rem={15}>
            <p className="tabular-nums">
              <span className="font-semibold">{shown[active].genre}</span>
              <span className="text-white/50"> — </span>
              <span style={{ color: YOU_COLOUR }}>
                {names.mine} {oneDecimal(shown[active].mineShown)}
              </span>{' '}
              <span className="text-white/60">({filmCount(shown[active].mine.count)})</span>
              <span className="text-white/40"> / </span>
              <span style={{ color: THEM_COLOUR }}>
                {names.theirs} {oneDecimal(shown[active].theirsShown)}
              </span>{' '}
              <span className="text-white/60">({filmCount(shown[active].theirs.count)})</span>
            </p>
            {moved && (
              <p className="mt-1 text-white/50 tabular-nums">
                {names.theirs} as given: {oneDecimal(shown[active].theirs.average)}
              </p>
            )}
          </ChartTip>
        )}
      </div>
    </TasteCard>
  )
}
