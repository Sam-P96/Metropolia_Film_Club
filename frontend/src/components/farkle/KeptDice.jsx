import Die from './Die'

// The dice set aside earlier this turn, in a small row above the table.
// The row keeps its height when empty, so the table doesn't jump.
export default function KeptDice({ dice }) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-center gap-1.5 text-xs uppercase tracking-widest text-white/50">
      {dice.length > 0 && (
        <>
          <span className="mr-1">Set aside</span>
          {dice.map((value, i) => (
            <Die key={i} value={value} size="small" />
          ))}
        </>
      )}
    </div>
  )
}