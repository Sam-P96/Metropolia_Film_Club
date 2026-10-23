import { useState } from 'react'
import studios from '../../data/studios'
import FilterSelect from './FilterSelect'
import GenreChips from './GenreChips'

// Pinned to the top of the studio list as well as appearing alphabetically.
const PINNED_STUDIO_ID = 420

const CERTIFICATIONS = [
  { value: '', label: 'Any rating' },
  { value: 'G', label: 'G' },
  { value: 'PG', label: 'PG' },
  { value: 'PG-13', label: 'PG-13' },
  { value: 'R', label: 'R' },
  { value: 'NC-17', label: 'NC-17' },
]

const SORTS = [
  { value: 'popularity.desc', label: 'Most popular' },
  { value: 'release_date.desc', label: 'Newest first' },
  { value: 'release_date.asc', label: 'Oldest first' },
  { value: 'vote_average.desc', label: 'Highest rated' },
  { value: 'vote_count.desc', label: 'Most voted' },
  { value: 'revenue.desc', label: 'Highest grossing' },
  { value: 'title.asc', label: 'Title A–Z' },
]

// Shown in stars out of 5, like club ratings (and TMDB's score on a film's
// page). The values stay TMDB's out of 10, which is what gets filtered on.
const MIN_RATINGS = [
  { value: '', label: 'Any rating' },
  { value: '5', label: '★ 2.5 and up' },
  { value: '6', label: '★ 3.0 and up' },
  { value: '7', label: '★ 3.5 and up' },
  { value: '8', label: '★ 4.0 and up' },
]

const MIN_VOTES = [
  { value: '', label: 'Any' },
  { value: '100', label: '100+ votes' },
  { value: '500', label: '500+ votes' },
  { value: '1000', label: '1,000+ votes' },
  { value: '5000', label: '5,000+ votes' },
]

const RUNTIME_MIN = [
  { value: '', label: 'Any' },
  { value: '60', label: 'Over 60 min' },
  { value: '90', label: 'Over 90 min' },
  { value: '120', label: 'Over 120 min' },
]

const RUNTIME_MAX = [
  { value: '', label: 'Any' },
  { value: '90', label: 'Under 90 min' },
  { value: '120', label: 'Under 120 min' },
  { value: '150', label: 'Under 150 min' },
  { value: '180', label: 'Under 180 min' },
]

const LANGUAGES = [
  { value: '', label: 'Any language' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'da', label: 'Danish' },
  { value: 'zh', label: 'Chinese' },
]

function buildYearOptions(label) {
  const thisYear = new Date().getFullYear()
  const years = [{ value: '', label }]

  for (let year = thisYear; year >= 1920; year -= 1) {
    years.push({ value: String(year), label: String(year) })
  }

  return years
}

const YEARS_FROM = buildYearOptions('Any')
const YEARS_TO = buildYearOptions('Any')

function buildStudioOptions() {
  const alphabetical = [...studios].sort((a, b) => a.name.localeCompare(b.name))
  const pinned = studios.find((studio) => studio.id === PINNED_STUDIO_ID)

  const options = [{ value: '', label: 'Any studio' }]

  if (pinned) {
    options.push({ value: String(pinned.id), label: pinned.name })
    options.push({ value: '__divider', label: '──────────', disabled: true })
  }

  alphabetical.forEach((studio) => {
    options.push({ value: String(studio.id), label: studio.name })
  })

  return options
}

const STUDIO_OPTIONS = buildStudioOptions()

function FilmFilters({ filters, genres, onChange, onToggleGenre, onClear }) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const selectedGenres = filters.genres ? filters.genres.split(',') : []
  const excludedGenres = filters.excludeGenres
    ? filters.excludeGenres.split(',')
    : []

  const reviewedOnly = Boolean(filters.reviewed)
  // Only the club's reviewed films have club ratings to sort by.
  const byClubRating = reviewedOnly && Boolean(filters.byClubRating)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">

      <div className="mb-5 flex flex-wrap gap-2">
        <CheckChip
          checked={reviewedOnly}
          onToggle={() => onChange('reviewed', reviewedOnly ? '' : '1')}
        >
          Movies with club reviews only
        </CheckChip>

        {reviewedOnly && (
          <CheckChip
            checked={byClubRating}
            onToggle={() => onChange('byClubRating', byClubRating ? '' : '1')}
          >
            Sort by club ratings
          </CheckChip>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <FilterSelect
          label="Studio"
          value={filters.studio}
          onChange={(value) => onChange('studio', value)}
          options={STUDIO_OPTIONS}
        />
        <FilterSelect
          label="From year"
          value={filters.yearFrom}
          onChange={(value) => onChange('yearFrom', value)}
          options={YEARS_FROM}
        />
        <FilterSelect
          label="To year"
          value={filters.yearTo}
          onChange={(value) => onChange('yearTo', value)}
          options={YEARS_TO}
        />
        <FilterSelect
          label="Age rating"
          value={filters.certification}
          onChange={(value) => onChange('certification', value)}
          options={CERTIFICATIONS}
        />
        {/* "Sort by club ratings" takes over while it's ticked. */}
        <FilterSelect
          label="Sort by"
          value={filters.sort}
          onChange={(value) => onChange('sort', value)}
          options={SORTS}
          disabled={byClubRating}
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold tracking-widest text-white/40 uppercase">
          Genres
        </p>
        <p className="mb-3 text-xs text-white/30">
          Pick more than one to find films that are all of them at once.
        </p>

        {genres.length === 0 ? (
          <p className="text-xs text-white/30">Loading genres…</p>
        ) : (
          <GenreChips
            genres={genres}
            selected={selectedGenres}
            onToggle={(id) => onToggleGenre('genres', id)}
          />
        )}
      </div>

      {showAdvanced && (
        <div className="mt-6 border-t border-white/10 pt-6">

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <FilterSelect
              label="Minimum TMDB rating"
              value={filters.minRating}
              onChange={(value) => onChange('minRating', value)}
              options={MIN_RATINGS}
            />
            <FilterSelect
              label="Minimum votes"
              value={filters.minVotes}
              onChange={(value) => onChange('minVotes', value)}
              options={MIN_VOTES}
            />
            <FilterSelect
              label="Runtime over"
              value={filters.runtimeMin}
              onChange={(value) => onChange('runtimeMin', value)}
              options={RUNTIME_MIN}
            />
            <FilterSelect
              label="Runtime under"
              value={filters.runtimeMax}
              onChange={(value) => onChange('runtimeMax', value)}
              options={RUNTIME_MAX}
            />
            <FilterSelect
              label="Original language"
              value={filters.language}
              onChange={(value) => onChange('language', value)}
              options={LANGUAGES}
            />
          </div>

          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold tracking-widest text-white/40 uppercase">
              Exclude genres
            </p>

            {genres.length > 0 && (
              <GenreChips
                genres={genres}
                selected={excludedGenres}
                onToggle={(id) => onToggleGenre('excludeGenres', id)}
                tone="red"
              />
            )}
          </div>

        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-medium text-white/60 transition-colors hover:text-white"
        >
          {showAdvanced ? '− Fewer filters' : '+ More filters'}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-brand-gold transition-colors hover:text-white"
        >
          Clear filters
        </button>
      </div>

    </div>
  )
}

// A pill with a tick box, for the on/off filters at the top.
function CheckChip({ checked, onToggle, children }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        checked
          ? 'border-brand-gold/60 bg-brand-gold/15 text-brand-gold'
          : 'border-white/10 bg-white/5 text-white/50 hover:border-white/25 hover:text-white'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
          checked ? 'border-brand-gold bg-brand-gold text-ink' : 'border-current'
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {children}
    </button>
  )
}

export default FilmFilters