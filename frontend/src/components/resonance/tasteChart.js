import { useEffect, useRef, useState } from 'react'

// What the taste charts (TasteScatter, TasteDumbbell, TasteRadar) share:
// whose colour is whose, the star scale, how numbers are shown, and the
// tooltip you get by hovering with a mouse or tapping on a phone.

// One colour each, the same in every chart: the logged-in member (or the
// first member of a /SECRETresonance pair) in the site's gold, the other
// member in Soul Resonance blue. Colour is never all there is: the other
// member's mark is a ring, or a dashed line, and every chart has a legend.
export const YOU_COLOUR = '#FABC3F'
export const THEM_COLOUR = '#4FA8FF'

// The ends of the star scale.
export const MIN_STARS = 0.5
export const MAX_STARS = 5

// A number as the charts show it: rounded to one place ("4.2"), a whole
// number without the ".0" ("4").
export const oneDecimal = (value) => String(Math.round(value * 10) / 10)

// "+0.4", "-0.3", "0": how far their ratings move, to one place.
export const signedStars = (value) => {
  const rounded = Math.round(value * 10) / 10
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

// The two ways the charts show ratings, like the comparison table's two
// columns. Difference: the star ratings as given. True difference: the
// other member's ratings moved by the gap between the two averages, onto
// the first member's (yours), so how far apart two ratings sit is the true
// difference Resonance counts; the same top or bottom rating from both
// stays the same, as it does there.
export const DIFFERENCE = 'difference'
export const TRUE_DIFFERENCE = 'true'
export const RATING_VIEWS = [
  { value: DIFFERENCE, label: 'Difference' },
  { value: TRUE_DIFFERENCE, label: 'True difference' },
]

// How far the other member's ratings move in the true difference: the gap
// between the averages (the comparison's `averages`, { mine, theirs }).
export const shiftOf = (averages) => (averages ? averages.mine - averages.theirs : 0)

// Their rating of a film as a chart shows it, next to mine: as given, or
// moved by `shift`, unless both gave the top or bottom rating.
export function shownTheirs(mine, theirs, view, shift) {
  if (view !== TRUE_DIFFERENCE) return theirs
  if (mine === theirs && (mine === MIN_STARS || mine === MAX_STARS)) return mine
  return theirs + shift
}

// The star scale a chart draws on: 0.5 to 5, or wider, by half stars, if
// a moved rating goes past either end. { min, max, steps (every half
// star), share(stars) (0 at min, 1 at max), labelled(stars) (whether a
// step gets a number: every one while there are ten or fewer, then whole
// stars only, so they fit) }.
export function starScale(values = []) {
  // Rounded first, so 5.000000000000001 doesn't widen it for nothing.
  const clean = values.map((value) => Math.round(value * 1e6) / 1e6)
  const min = Math.floor(Math.min(MIN_STARS, ...clean) * 2) / 2
  const max = Math.ceil(Math.max(MAX_STARS, ...clean) * 2) / 2
  const steps = []
  for (let half = min * 2; half <= max * 2; half += 1) steps.push(half / 2)
  return {
    min,
    max,
    steps,
    share: (stars) => (stars - min) / (max - min),
    labelled: (stars) => steps.length <= 10 || Number.isInteger(stars),
  }
}

// "1 film", "12 films".
export const filmCount = (count) => `${count} ${count === 1 ? 'film' : 'films'}`

// A film's small poster, or null.
export const posterUrl = (path) => (path ? `https://image.tmdb.org/t/p/w92${path}` : null)

// What the two sides are called. On your own comparison: "You", and the
// other member's name in legends and axes, "Them" in tooltips. On a
// /SECRETresonance pair page (`myName` given): both names, everywhere.
export function whoIsWho(theirName, myName) {
  return {
    mine: myName ?? 'You',
    theirs: myName ? theirName : 'Them',
    theirLegend: theirName,
    // For sentences: "you" or the first member's name, and "your" or theirs.
    me: myName ?? 'you',
    my: myName ? `${myName}'s` : 'your',
    // "you and Ann" or "Bob and Ann".
    both: `${myName ?? 'you'} and ${theirName}`,
  }
}

// A chart's tooltip: which of its points is showing one (`tip`, a key, or
// null), and tipTarget(key), the props that make an SVG element a point.
// A mouse shows it while hovering (and a click keeps it); a tap shows it
// and a second tap, or a tap anywhere else, closes it; the keyboard gets
// it on focus, and Escape closes it.
export function useChartTip() {
  const [tip, setTip] = useState(null)
  const pointer = useRef(null)

  useEffect(() => {
    if (tip === null) return undefined
    const away = (event) => {
      if (!event.target.closest?.('[data-chart-point]')) setTip(null)
    }
    const escape = (event) => {
      if (event.key === 'Escape') setTip(null)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', escape)
    }
  }, [tip])

  const tipTarget = (key) => ({
    'data-chart-point': '',
    tabIndex: 0,
    role: 'button',
    'aria-expanded': tip === key,
    onPointerDown: (event) => {
      pointer.current = event.pointerType
    },
    onPointerEnter: (event) => {
      if (event.pointerType === 'mouse') setTip(key)
    },
    onPointerLeave: (event) => {
      if (event.pointerType === 'mouse') setTip((current) => (current === key ? null : current))
    },
    onClick: () => {
      const mouse = pointer.current === 'mouse'
      pointer.current = null
      setTip((current) => (mouse || current !== key ? key : null))
    },
    onFocus: (event) => {
      // Only the keyboard's focus: a tap focuses too, and its click decides.
      if (event.currentTarget.matches(':focus-visible')) setTip(key)
    },
    onBlur: () => setTip((current) => (current === key ? null : current)),
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setTip((current) => (current === key ? null : key))
      }
    },
  })

  return { tip, tipTarget }
}
