export async function getTrending() {
  const response = await fetch('/api/tmdb/trending')

  if (!response.ok) {
    throw new Error('Failed to fetch trending movies')
  }

  return response.json()
}

export async function searchFilms(query) {
  const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`)

  if (!response.ok) {
    throw new Error('Search failed')
  }

  return response.json()
}