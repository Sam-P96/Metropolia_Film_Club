// The glow round a card for someone close to the logged-in member: `soul`
// (a Soul Resonance) is a glowing blue border whose edge catches the light
// like glass, bright where the light hits and fading along the rim, with a
// fainter glint in the opposite corner; `friend` is the same in a softer
// purple. All in index.css, under "Card glows", where it can be tuned. Put
// it after the card inside a `relative` wrapper the card's size, so the
// glow can spill past the card's edge while the card keeps hiding its own
// overflow. `shape` is 'card' (rounded-2xl), or 'circle' for a round
// profile picture, where it sits over the picture's faint ring.
const SHAPES = {
  card: 'inset-0 rounded-2xl',
  circle: '-inset-0.5 rounded-full',
}

function CardShine({ tone = 'soul', shape = 'card' }) {
  return (
    <div
      aria-hidden="true"
      className={`card-glow card-glow-${tone} pointer-events-none absolute z-1 ${SHAPES[shape]}`}
    />
  )
}

export default CardShine
