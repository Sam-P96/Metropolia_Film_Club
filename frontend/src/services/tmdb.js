export async function getTrending() {
    const response = await fetch('/api/tmdb/trending')

    if (!response.ok) {
        throw new Error('Failed to fetch trending movies')
    }

    return response.json()
}