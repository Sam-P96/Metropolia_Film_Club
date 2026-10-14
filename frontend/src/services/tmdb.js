export async function getTrending() {
  const response = await fetch('/api/tmdb/trending')

  if (!response.ok) {
    throw new Error('Failed to fetch trending movies')
  }

  return response.json()
}

export async function searchFilms(query, page = 1) {
  const response = await fetch(
    `/api/tmdb/search?query=${encodeURIComponent(query)}&page=${page}`
  )

  if (!response.ok) {
    throw new Error('Search failed')
  }

  return response.json()
}

const DISCOVER_KEYS = [
  'studio',
  'genres',
  'excludeGenres',
  'yearFrom',
  'yearTo',
  'certification',
  'minRating',
  'minVotes',
  'runtimeMin',
  'runtimeMax',
  'language',
  'sort',
]

export async function discoverFilms(filters = {}, page = 1) {
  const params = new URLSearchParams({ page })

  DISCOVER_KEYS.forEach((key) => {
    if (filters[key]) params.set(key, filters[key])
  })

  const response = await fetch(`/api/tmdb/discover?${params}`)

  if (!response.ok) {
    throw new Error('Discover failed')
  }

  return response.json()
}

export async function getGenres() {
  const response = await fetch('/api/tmdb/genres')

  if (!response.ok) {
    throw new Error('Failed to fetch genres')
  }

  return response.json()
}

export async function getFilm(tmdbId) {
  const response = await fetch(`/api/tmdb/movie/${tmdbId}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to fetch film')
  }

  return response.json()
}