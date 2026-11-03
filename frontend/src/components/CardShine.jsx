// The glow round a card for someone close to the logged-in member: `soul`
// (a Soul Resonance) is a glowing blue border whose edge catches the light
// like glass, bright where the light hits and fading along the rim, with a
// fainter glint in the opposite corner; `friend` is the same in a softer
// purple. All in index.css, under "Card glows", where it can be tuned. Put
// it after the card inside a `relative` wrapper the card's size, so the
// glow can spill past the card's edge while the card keeps hiding its own
// overflow.
function CardShine({ tone = 'soul' }) {
  return (
    <div
      aria-hidden="true"
      className={`card-glow card-glow-${tone} pointer-events-none absolute inset-0 z-1 rounded-2xl`}
    />
  )
}

export default CardShine
