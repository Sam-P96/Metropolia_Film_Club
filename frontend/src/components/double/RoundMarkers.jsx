// The three rounds as markers: a tick and W for a win, = and D for a draw,
// a cross and L for a loss, an empty dashed box for a round not played.
// Each has its own shape and letter as well as its colour.
const LOOKS = {
  win: { letter: 'W', mark: '✓', word: 'win', className: 'border-emerald-400 bg-emerald-500/20 text-emerald-200' },
  draw: { letter: 'D', mark: '=', word: 'draw', className: 'border-brand-gold/80 bg-brand-gold/10 text-brand-gold' },
  loss: { letter: 'L', mark: '✗', word: 'loss', className: 'border-brand-red bg-brand-red/25 text-red-200' },
}

export default function RoundMarkers({ results, total = 3 }) {
  return (
    <ol className="flex gap-2" aria-label="Rounds so far">
      {Array.from({ length: total }, (_, i) => {
        const look = LOOKS[results[i]]
        return (
          <li
            key={i}
            aria-label={`Round ${i + 1}: ${look ? look.word : 'not played'}`}
            className={`flex size-11 flex-col items-center justify-center rounded-lg border-2 leading-none ${
              look ? look.className : 'border-dashed border-white/20 text-white/30'
            }`}
          >
            {look ? (
              <>
                <span className="text-sm font-black" aria-hidden="true">{look.letter}</span>
                <span className="text-xs" aria-hidden="true">{look.mark}</span>
              </>
            ) : (
              <span className="text-xs" aria-hidden="true">{i + 1}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
