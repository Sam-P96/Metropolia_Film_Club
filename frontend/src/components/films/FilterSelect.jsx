function FilterSelect({ label, value, onChange, options, disabled }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-widest text-white/40 uppercase">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-brand-gold/60 focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {options.map((option, index) => (
          <option
            key={`${option.value}-${index}`}
            value={option.value}
            disabled={option.disabled}
            className="bg-ink"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default FilterSelect