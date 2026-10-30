// The last few things that happened: banks, Farkles and hot dice, newest
// first.
export default function MatchLog({ log, you = 'You' }) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-plum/40 p-5 shadow-xl shadow-black/40 backdrop-blur-md">
      <h2 className="mb-3 font-['Cinzel'] text-xl text-brand-gold">Table talk</h2>
      {log.length === 0 ? (
        <p className="text-sm text-white/50">Banked points, Farkles and hot dice show up here as you play.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {log.map((entry) => (
            <li key={entry.id} className="flex gap-2 text-sm">
              <span className={`shrink-0 ${entry.who === you ? 'text-brand-gold' : 'text-white/50'}`}>{entry.who === you ? 'You' : 'Bot'}</span>
              <span className="text-white/90">{entry.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}