import { THEM_COLOUR, YOU_COLOUR } from './tasteChart'

// The taste charts' shared pieces: the card each sits in, the legend, the
// empty message and the tooltip.

// The card a chart sits in, with its title and legend.
export function TasteCard({ title, legend, children }) {
  return (
    <figure className="min-w-0 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="text-sm font-semibold tracking-widest text-white/70 uppercase">{title}</h3>
        {legend}
      </div>
      {children}
    </figure>
  )
}

// Who's who: you (a dot and a solid line, gold) and them (a ring and,
// with `dashed`, a dashed line, blue).
export function TasteLegend({ mine, theirs, dashed = false }) {
  const swatch = (colour, ring, dash) => (
    <svg viewBox="0 0 28 12" width="28" height="12" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="6" x2="27" y2="6" stroke={colour} strokeWidth="2" strokeDasharray={dash ? '4 3' : undefined} />
      <circle cx="14" cy="6" r="4" fill={ring ? '#0B0710' : colour} stroke={colour} strokeWidth={ring ? 2 : 0} />
    </svg>
  )

  return (
    <ul className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80" aria-label="Legend">
      <li className="flex min-w-0 items-center gap-1.5">
        {swatch(YOU_COLOUR, false, false)}
        <span className="truncate">{mine}</span>
      </li>
      <li className="flex min-w-0 items-center gap-1.5">
        {swatch(THEM_COLOUR, true, dashed)}
        <span className="max-w-40 truncate">{theirs}</span>
      </li>
    </ul>
  )
}

// Text that changes with the Difference / True difference toggle without
// changing the size of what it's in: every version (`texts`, by key) is
// laid out in the same spot, only `shown` visible, so the box is always as
// tall as the longest of them at any width. `as` is the element (a <p>,
// or a <figcaption>).
export function SteadyText({ texts, shown, as: Tag = 'p', className = '' }) {
  return (
    <Tag className={`grid items-center ${className}`}>
      {Object.entries(texts).map(([key, text]) => (
        <span key={key} className={`col-start-1 row-start-1 ${key === shown ? '' : 'invisible'}`} aria-hidden={key === shown ? undefined : true}>
          {text}
        </span>
      ))}
    </Tag>
  )
}

// In place of a chart, with no films both have rated.
export function NoFilmsInCommon() {
  return <p className="py-6 text-center text-sm text-white/60">No films in common yet.</p>
}

// A tooltip over a chart (whose box needs `relative`), at (`x`, `y`) in the
// SVG's own units out of `width` by `height`. It stays inside the chart's
// width, so it never makes a phone scroll sideways, and goes below a point
// near the top and above one lower down. `rem` is how wide it is.
export function ChartTip({ x, y, width, height, rem = 14, children }) {
  const across = (x / width) * 100
  const below = y / height < 0.4

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 rounded-lg border border-white/15 bg-ink/95 px-3 py-2 text-xs text-white shadow-xl shadow-black/50"
      style={{
        width: `min(${rem}rem, 100%)`,
        left: `clamp(0px, calc(${across}% - min(${rem / 2}rem, 50%)), calc(100% - min(${rem}rem, 100%)))`,
        top: `${(y / height) * 100}%`,
        transform: below ? 'translateY(14px)' : 'translateY(calc(-100% - 14px))',
      }}
    >
      {children}
    </div>
  )
}
