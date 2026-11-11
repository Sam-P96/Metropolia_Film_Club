import { useState } from 'react'
import { wheelColour } from './wheelColours'

// The box's colour (white), between slices and round the wheel.
const SURFACE = '#ffffff'

const percent = (share) => `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`

// A point on the circle `radius` from the middle of a 200 x 200 box, at
// `turn` (0 to 1, clockwise from the top).
const at = (radius, turn) => [100 + radius * Math.sin(turn * 2 * Math.PI), 100 - radius * Math.cos(turn * 2 * Math.PI)]

// A ring slice from `start` to `end` (turns).
function slicePath(start, end, outer, inner) {
  const large = end - start > 0.5 ? 1 : 0
  const [ox1, oy1] = at(outer, start)
  const [ox2, oy2] = at(outer, end)
  const [ix2, iy2] = at(inner, end)
  const [ix1, iy1] = at(inner, start)
  return `M${ox1} ${oy1} A${outer} ${outer} 0 ${large} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`
}

// The Quiz Wheel: everyone's share of this week's draw, a slice each, the
// most points first, clockwise from the top. Your own slice stands out a
// little. Pointing at (or tapping) a slice names it in the middle;
// otherwise the middle says your chance. The Quiz Leaderboard beside it is
// its legend, with the same colours.
//   entries  [{ user, points, share }], most first
//   myId     the viewer's id
export default function QuizWheel({ entries, myId }) {
  const [pointed, setPointed] = useState(null)
  const OUTER = 92
  const INNER = 54
  const total = entries.reduce((sum, entry) => sum + entry.points, 0)
  if (total === 0) return null

  const mine = entries.find((entry) => entry.user._id === myId)
  const shown = pointed !== null ? entries[pointed] : mine
  let turn = 0

  return (
    <figure className="mx-auto flex w-full max-w-xs flex-col items-center gap-3">
      <svg viewBox="0 0 200 200" className="w-full overflow-visible" role="img" aria-label={`The Quiz Wheel: ${entries.map((entry) => `${entry.user.username} ${percent(entry.share)}`).join(', ')}`}>
        {entries.length === 1 ? (
          <circle cx="100" cy="100" r={(OUTER + INNER) / 2} fill="none" stroke={wheelColour(0)} strokeWidth={OUTER - INNER} />
        ) : (
          entries.map((entry, i) => {
            const start = turn
            const end = turn + entry.points / total
            turn = end
            const yours = entry.user._id === myId
            // Your slice moves out a touch, along its middle.
            const [dx, dy] = yours ? at(5, (start + end) / 2).map((value) => value - 100) : [0, 0]
            return (
              <path
                key={entry.user._id}
                d={slicePath(start, end, OUTER, INNER)}
                fill={wheelColour(i)}
                stroke={SURFACE}
                strokeWidth="2"
                strokeLinejoin="round"
                transform={`translate(${dx} ${dy})`}
                tabIndex={0}
                aria-label={`${entry.user.username}: ${entry.points} point${entry.points === 1 ? '' : 's'}, ${percent(entry.share)}`}
                onMouseEnter={() => setPointed(i)}
                onMouseLeave={() => setPointed(null)}
                onFocus={() => setPointed(i)}
                onBlur={() => setPointed(null)}
                onClick={() => setPointed(pointed === i ? null : i)}
                className="cursor-pointer outline-none transition-opacity focus-visible:opacity-80"
                style={{ opacity: pointed !== null && pointed !== i ? 0.55 : 1 }}
              />
            )
          })
        )}
        <text x="100" y="92" textAnchor="middle" className="fill-[#52514e]" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
          {shown ? (shown === mine && pointed === null ? 'YOUR CHANCE' : shown.user.username.slice(0, 18).toUpperCase()) : 'TICKETS'}
        </text>
        <text x="100" y="118" textAnchor="middle" className="fill-ink font-bold" style={{ fontSize: 24 }}>
          {shown ? percent(shown.share) : total}
        </text>
      </svg>
      <figcaption className="text-center text-sm text-ink/60">
        {total} ticket{total === 1 ? '' : 's'} this week: one for each quiz point.
      </figcaption>
    </figure>
  )
}
