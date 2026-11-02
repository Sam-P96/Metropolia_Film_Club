import { artOf } from './art'

// A symbol's picture or emoji, `size` pixels square, for the paytables.
export default function SymbolArt({ symbolKey, size = 28, className = '' }) {
  const art = artOf(symbolKey)
  if (art.emoji) {
    return (
      <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center leading-none ${className}`} style={{ width: size, height: size, fontSize: size * 0.8 }}>
        {art.emoji}
      </span>
    )
  }
  return <img src={art.src} alt="" draggable="false" width={size} height={size} className={`shrink-0 object-contain ${className}`} />
}

// A symbol on the reels' ivory, `size` pixels square: how symbols show away
// from the reels, so the dark parts of the logo don't vanish on dark glass.
export function SymbolTile({ symbolKey, size = 32, className = '' }) {
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-md bg-dice-ivory ${className}`} style={{ width: size, height: size }}>
      <SymbolArt symbolKey={symbolKey} size={Math.round(size * 0.8)} />
    </span>
  )
}
