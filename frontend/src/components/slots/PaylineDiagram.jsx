import { SLOTS } from '../../../../shared/slots/config.js'

// One payline drawn small: the 5 x 3 grid as dots, with the line's cells
// lit gold and joined up. `rows` is the row it passes through on each reel.
export default function PaylineDiagram({ rows, name, width = 56 }) {
  const gap = 10
  const height = (width / (SLOTS.reels * gap)) * (SLOTS.rows * gap)
  const at = (reel, row) => ({ x: gap / 2 + reel * gap, y: gap / 2 + row * gap })
  const points = rows.map((row, reel) => at(reel, row))

  return (
    <svg viewBox={`0 0 ${SLOTS.reels * gap} ${SLOTS.rows * gap}`} width={width} height={height} role="img" aria-label={name} className="shrink-0">
      {Array.from({ length: SLOTS.reels }, (_, reel) =>
        Array.from({ length: SLOTS.rows }, (_, row) => {
          const { x, y } = at(reel, row)
          return <circle key={`${reel}-${row}`} cx={x} cy={y} r="1.6" fill="rgb(255 255 255 / 0.25)" />
        })
      )}
      <polyline
        points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="var(--color-brand-gold)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map(({ x, y }, reel) => (
        <circle key={reel} cx={x} cy={y} r="2.6" fill="var(--color-brand-gold)" />
      ))}
    </svg>
  )
}
