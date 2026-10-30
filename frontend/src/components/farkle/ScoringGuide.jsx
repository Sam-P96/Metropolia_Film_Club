import Die from './Die'

const COMBOS = [
  { faces: [1], points: '100' },
  { faces: [5], points: '50' },
  { faces: [1, 1, 1], points: '1,000' },
  { faces: [4, 4, 4], points: '400' },
  { faces: [1, 2, 3, 4, 5], points: '500' },
  { faces: [2, 3, 4, 5, 6], points: '750' },
  { faces: [1, 2, 3, 4, 5, 6], points: '1,500' },
]

const CARD = 'min-w-0 rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md'

// What scores, and how a turn works. It never changes, so it takes no props.
export default function ScoringGuide() {
  return (
    <section className={CARD}>
      <h2 className="mb-3 font-['Cinzel'] text-xl text-brand-gold">Scoring</h2>
      <ul className="flex flex-col gap-2">
        {COMBOS.map((combo) => (
          <li key={combo.faces.join('')} className="flex items-center justify-between gap-3">
            <span className="flex flex-wrap gap-1">
              {combo.faces.map((face, i) => (
                <Die key={i} value={face} size="tiny" />
              ))}
            </span>
            <span className="font-bold tabular-nums text-white">{combo.points}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-white/60">
        Three of a kind is the face × 100 (three 1s are 1,000). Each extra matching die doubles it: four 4s = 800, five 4s = 1,600.
      </p>
      <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5 text-sm text-white/80">
        <li>Roll, then set aside at least one scoring die.</li>
        <li>Roll the rest to push your luck, or bank the points.</li>
        <li>A roll with nothing that scores is a Farkle: you lose the turn's points.</li>
        <li>Score with all six dice and you get hot dice: roll all six again.</li>
      </ol>
    </section>
  )
}