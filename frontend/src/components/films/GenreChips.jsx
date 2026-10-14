function GenreChips({ genres, selected, onToggle, tone = 'gold' }) {
  const activeClasses =
    tone === 'red'
      ? 'rounded-full border border-brand-red/60 bg-brand-red/15 px-3 py-1.5 text-xs font-medium text-brand-red transition-colors'
      : 'rounded-full border border-brand-gold/60 bg-brand-gold/15 px-3 py-1.5 text-xs font-medium text-brand-gold transition-colors'

  const idleClasses =
    'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-white/25 hover:text-white'

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => {
        const id = String(genre.id)
        const active = selected.includes(id)

        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            aria-pressed={active}
            className={active ? activeClasses : idleClasses}
          >
            {genre.name}
          </button>
        )
      })}
    </div>
  )
}

export default GenreChips