import { ChartTip, NoFilmsInCommon, SteadyText, TasteCard, TasteLegend } from './TasteParts'
import {
  DIFFERENCE,
  THEM_COLOUR,
  TRUE_DIFFERENCE,
  YOU_COLOUR,
  filmCount,
  oneDecimal,
  posterUrl,
  shiftOf,
  shownTheirs,
  signedStars,
  starScale,
  useChartTip,
  whoIsWho,
} from './tasteChart'

// The square chart, in its own units: the plot, and room for the axes.
const VIEW = 320
const PAD = { left: 44, right: 14, top: 14, bottom: 44 }
const PLOT = VIEW - PAD.left - PAD.right

// Films listed in a spot's tooltip; any more are counted.
const LISTED = 6
// A spot's size: one film, and as big as it gets.
const SMALLEST = 4.5
const BIGGEST = 13
const EQUAL_COLOUR = '#E5E7EB'
// Closer than this is the same place.
const SAME = 1e-6

// The films grouped by where they land, (my rating, theirs as shown): one
// spot each, biggest first so smaller ones are drawn over them.
function spotsOf(points) {
  const spots = new Map()
  for (const point of points) {
    const key = `${point.mine}|${point.theirs.toFixed(4)}`
    if (!spots.has(key)) spots.set(key, { key, mine: point.mine, theirs: point.theirs, films: [] })
    spots.get(key).films.push(point.film)
  }
  return [...spots.values()]
    .map((spot) => ({ ...spot, films: spot.films.sort((a, b) => a.title.localeCompare(b.title)) }))
    .sort((a, b) => b.films.length - a.films.length)
}

const radiusOf = (count) => Math.min(BIGGEST, SMALLEST + 2.6 * Math.sqrt(count - 1))

// Above the line their colour, below it mine, on it neither.
const colourOf = (spot) =>
  spot.theirs - spot.mine > SAME ? THEM_COLOUR : spot.mine - spot.theirs > SAME ? YOU_COLOUR : EQUAL_COLOUR

// Every film both have rated, my star rating across and theirs up, the
// films that land on the same spot drawn as one dot, bigger the more there
// are. The dashed diagonal is the same rating, and the shaded band within
// half a star of it. A spot shows its films on hover, or on a tap.
// `films` is the comparison's films (services/resonance.js
// getResonanceWith), `theirName` the other member's name. `view` is
// DIFFERENCE (the star ratings as given, the default) or TRUE_DIFFERENCE
// (theirs moved by the gap between the two `averages`, the comparison's,
// so the distance from the line is the true difference). `myName` is only
// for a /SECRETresonance pair, in place of "You".
export default function TasteScatter({ films, theirName, myName, view = DIFFERENCE, averages }) {
  const { tip, tipTarget } = useChartTip()
  const names = whoIsWho(theirName, myName)
  const legend = <TasteLegend mine={names.mine} theirs={names.theirLegend} />

  if (!films?.length) {
    return (
      <TasteCard title="Every rating" legend={legend}>
        <NoFilmsInCommon />
      </TasteCard>
    )
  }

  const moved = view === TRUE_DIFFERENCE
  const shift = shiftOf(averages)
  const points = films.map((film) => ({
    film,
    mine: film.mine.rating,
    theirs: shownTheirs(film.mine.rating, film.theirs.rating, view, shift),
  }))
  const scale = starScale(points.flatMap((point) => [point.mine, point.theirs]))
  const xOf = (stars) => PAD.left + scale.share(stars) * PLOT
  const yOf = (stars) => PAD.top + (1 - scale.share(stars)) * PLOT

  const spots = spotsOf(points)
  const shown = spots.find((spot) => spot.key === tip)
  const band = [
    [scale.min, scale.min + 0.5],
    [scale.max - 0.5, scale.max],
    [scale.max, scale.max],
    [scale.max, scale.max - 0.5],
    [scale.min + 0.5, scale.min],
    [scale.min, scale.min],
  ]
    .map(([mine, theirs]) => `${xOf(mine)},${yOf(theirs)}`)
    .join(' ')
  const movedBy = `${theirName}'s ratings moved ${signedStars(shift)} stars onto ${names.my} average`

  return (
    <TasteCard title="Every rating" legend={legend}>
      <div className="relative mx-auto w-full max-w-md">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="block h-auto w-full select-none"
          role="group"
          aria-label={`Scatter chart of the ${filmCount(films.length)} ${names.both} have both rated: ${names.my} star rating across, ${theirName}'s up${moved ? `, ${movedBy} (the true difference)` : ''}, from ${oneDecimal(scale.min)} to ${oneDecimal(scale.max)}. Films above the diagonal ${theirName} rated higher, below it ${names.me} did.`}
        >
          {/* The grid, every half star. */}
          {scale.steps.map((stars) => (
            <g key={stars} stroke="rgba(255,255,255,0.07)" strokeWidth="1">
              <line x1={xOf(stars)} y1={PAD.top} x2={xOf(stars)} y2={PAD.top + PLOT} />
              <line x1={PAD.left} y1={yOf(stars)} x2={PAD.left + PLOT} y2={yOf(stars)} />
            </g>
          ))}
          <rect x={PAD.left} y={PAD.top} width={PLOT} height={PLOT} fill="none" stroke="rgba(255,255,255,0.18)" />

          {/* Within half a star, and the same rating. */}
          <polygon points={band} fill="rgba(255,255,255,0.06)" />
          <line
            x1={xOf(scale.min)}
            y1={yOf(scale.min)}
            x2={xOf(scale.max)}
            y2={yOf(scale.max)}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />

          {/* The scales. */}
          {scale.steps.filter(scale.labelled).map((stars) => (
            <g key={`label-${stars}`} fill="rgba(255,255,255,0.5)" fontSize="9">
              <text x={xOf(stars)} y={PAD.top + PLOT + 14} textAnchor="middle">
                {oneDecimal(stars)}
              </text>
              <text x={PAD.left - 7} y={yOf(stars)} textAnchor="end" dominantBaseline="middle">
                {oneDecimal(stars)}
              </text>
            </g>
          ))}
          <text x={PAD.left + PLOT / 2} y={VIEW - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill={YOU_COLOUR}>
            {names.mine} →
          </text>
          <text
            x={12}
            y={PAD.top + PLOT / 2}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={THEM_COLOUR}
            transform={`rotate(-90 12 ${PAD.top + PLOT / 2})`}
          >
            {theirName}
            {moved ? ` (${signedStars(shift)})` : ''} →
          </text>

          {/* One dot a spot. */}
          {spots.map((spot) => {
            const count = spot.films.length
            const r = radiusOf(count)
            const active = tip === spot.key
            return (
              <g
                key={spot.key}
                {...tipTarget(spot.key)}
                aria-label={`${filmCount(count)}: ${names.mine} ${oneDecimal(spot.mine)}, ${names.theirs} ${oneDecimal(spot.theirs)}`}
                className="cursor-pointer outline-none"
              >
                {/* A bigger invisible target, for fingers. */}
                <circle cx={xOf(spot.mine)} cy={yOf(spot.theirs)} r={Math.max(r, 11)} fill="transparent" />
                <circle
                  cx={xOf(spot.mine)}
                  cy={yOf(spot.theirs)}
                  r={r}
                  fill={colourOf(spot)}
                  fillOpacity={active ? 1 : 0.85}
                  stroke={active ? '#fff' : '#0B0710'}
                  strokeWidth={active ? 2 : 1.5}
                />
                {count > 1 && r >= 7 && (
                  <text
                    x={xOf(spot.mine)}
                    y={yOf(spot.theirs)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="9"
                    fontWeight="700"
                    fill="#0B0710"
                    pointerEvents="none"
                  >
                    {count}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {shown && (
          <ChartTip x={xOf(shown.mine)} y={yOf(shown.theirs)} width={VIEW} height={VIEW}>
            <p className="mb-1.5 font-semibold tabular-nums">
              <span style={{ color: YOU_COLOUR }}>
                {names.mine} {oneDecimal(shown.mine)}
              </span>
              <span className="text-white/40"> / </span>
              <span style={{ color: THEM_COLOUR }}>
                {names.theirs} {oneDecimal(shown.theirs)}
              </span>
              <span className="font-normal text-white/50"> · {filmCount(shown.films.length)}</span>
            </p>
            <ul className="space-y-1.5">
              {shown.films.slice(0, LISTED).map((film) => (
                <li key={film.tmdbId} className="flex items-center gap-2">
                  <span className="block h-9 w-6 shrink-0 overflow-hidden rounded-sm bg-white/10">
                    {posterUrl(film.posterPath) && <img src={posterUrl(film.posterPath)} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{film.title}</span>
                    <span className="text-white/50">
                      {film.year}
                      {/* Moved, what they actually gave it. */}
                      {moved && `${film.year ? ' · ' : ''}${names.theirs} gave ${oneDecimal(film.theirs.rating)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {shown.films.length > LISTED && <p className="mt-1.5 text-white/50">and {shown.films.length - LISTED} more</p>}
          </ChartTip>
        )}
      </div>

      {/* Both captions take the same room, so the toggle never resizes the card. */}
      <SteadyText
        as="figcaption"
        className="mt-2 text-center text-xs text-white/55"
        shown={view}
        texts={{
          [DIFFERENCE]: `Above the line: ${theirName} liked it more. Below: ${names.me} did.`,
          [TRUE_DIFFERENCE]: `${movedBy}. Above the line: ${theirName} liked it more. Below: ${names.me} did.`,
        }}
      />
    </TasteCard>
  )
}
