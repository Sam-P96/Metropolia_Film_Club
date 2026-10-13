import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function SearchBar({ to, placeholder = 'Search for a film...', size = 'md' }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmed = query.trim()
    if (!trimmed) return

    navigate(`${to}?q=${encodeURIComponent(trimmed)}`)
  }

  const inputClasses =
    size === 'lg'
      ? 'w-full rounded-md border border-white/10 bg-white/5 px-5 py-3.5 text-base text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10'
      : 'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-brand-gold/60 focus:bg-white/10'

  const buttonClasses =
    size === 'lg'
      ? 'shrink-0 rounded-md bg-brand-red px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-orange'
      : 'shrink-0 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange'

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={inputClasses}
      />
      <button type="submit" className={buttonClasses}>
        Search
      </button>
    </form>
  )
}

export default SearchBar