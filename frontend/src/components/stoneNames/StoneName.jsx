import { useEffect, useLayoutEffect, useRef } from 'react'
import { useCosmeticsStill } from '../cosmetics/stillCosmetics'
import { STONE_NAMES } from '../../../../shared/stoneNames/config.js'
import { startStoneFx } from './stoneFx'
import './stoneNames.css'

// Below this font size, the liquid, smoke and water are drawn finer, or
// they'd swallow the letters.
const SMALL_PX = 20

// The name a letter at a time, for the stones that move each letter.
function Letters({ name }) {
  return [...name].map((letter, i) => (
    <span key={i} className="isn-l" style={{ '--i': i }}>
      {letter}
    </span>
  ))
}

// The Time Stone's spell rings, turning behind the name.
function Mandala() {
  const ticks = Array.from({ length: 48 }, (_, i) => (
    <line key={i} x1="100" y1="6" x2="100" y2={i % 4 ? 12 : 19} transform={`rotate(${i * 7.5} 100 100)`} />
  ))
  const runes = Array.from({ length: 12 }, (_, i) => (
    <rect key={i} x="96" y="27" width="8" height="8" transform={`rotate(${i * 30} 100 100) rotate(45 100 31)`} />
  ))
  const spokes = Array.from({ length: 8 }, (_, i) => <line key={i} x1="100" y1="54" x2="100" y2="70" transform={`rotate(${i * 45} 100 100)`} />)
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor">
      <g className="isn-m1" strokeWidth="1.6">
        <circle cx="100" cy="100" r="96" />
        <circle cx="100" cy="100" r="86" strokeDasharray="3 5" strokeWidth="1.2" />
        {ticks}
      </g>
      <g className="isn-m2" strokeWidth="1.4">
        <circle cx="100" cy="100" r="74" />
        {runes}
        <circle cx="100" cy="100" r="58" strokeDasharray="10 4 2 4" />
        {spokes}
      </g>
      <g className="isn-m3" strokeWidth="1.6">
        <rect x="70" y="70" width="60" height="60" />
        <rect x="70" y="70" width="60" height="60" transform="rotate(45 100 100)" />
        <circle cx="100" cy="100" r="26" strokeDasharray="2 3" />
      </g>
    </svg>
  )
}

// What goes behind the name for each stone, and whether its letters move
// one at a time.
function behind(stone, name) {
  switch (stone) {
    case 'space':
      return <span className="isn-portal" aria-hidden="true" />
    case 'mind':
      return (
        <>
          <span className="isn-haze" aria-hidden="true" />
          <span className="isn-ring" aria-hidden="true" />
          <span className="isn-ring isn-r2" aria-hidden="true" />
          <span className="isn-ring isn-r3" aria-hidden="true" />
        </>
      )
    case 'reality':
      return <span className="isn-aether" aria-hidden="true" />
    case 'power':
      return (
        <>
          <span className="isn-aura" aria-hidden="true" />
          <svg className="isn-bolts" aria-hidden="true" />
        </>
      )
    case 'time':
      return (
        <>
          <span className="isn-mandala" aria-hidden="true">
            <Mandala />
          </span>
          <span className="isn-ghost isn-g1" aria-hidden="true">
            {name}
          </span>
          <span className="isn-ghost isn-g2" aria-hidden="true">
            {name}
          </span>
        </>
      )
    case 'soul':
      return (
        <>
          <span className="isn-halo" aria-hidden="true" />
          <span className="isn-water" aria-hidden="true" />
          <span className="isn-reflect" aria-hidden="true">
            {name}
          </span>
        </>
      )
    default:
      return null
  }
}

const BY_LETTER = new Set(['mind', 'time'])

// A member's name in the effect of an Infinity Stone they hold (`stone`, an
// id from shared/stoneNames/config.js), in the font, size and weight of
// wherever it sits, wrapping like the plain name. StyledUsername puts it in
// place of their Black Market name style; hovering says which stone.
export default function StoneName({ name, stone }) {
  const still = useCosmeticsStill()
  const host = useRef(null)
  const info = STONE_NAMES[stone]

  // Finer filters for small names. Set here, after every render that can
  // change the class list, so nothing is measured before it's on the page.
  useLayoutEffect(() => {
    const element = host.current
    if (!element) return
    element.classList.toggle('isn-sm', parseFloat(getComputedStyle(element).fontSize) < SMALL_PX)
  }, [stone, still])

  useEffect(() => {
    if (still || !host.current) return undefined
    return startStoneFx(host.current, stone)
  }, [stone, still, name])

  if (!info) return name

  return (
    <span ref={host} className={`isn isn-${stone}${still ? ' isn-still' : ''}`} title={info.name}>
      {behind(stone, name)}
      <span className="isn-fx" aria-hidden="true" />
      <span className="isn-t">{BY_LETTER.has(stone) ? <Letters name={name} /> : name}</span>
      <span className="isn-flare" aria-hidden="true">
        <i />
        <b />
        <b />
      </span>
    </span>
  )
}
