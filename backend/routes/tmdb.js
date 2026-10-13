const express = require('express')

const router = express.Router()

const TMDB_BASE = 'https://api.themoviedb.org/3'

const tmdbHeaders = {
  Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
  accept: 'application/json',
}

router.get('/trending', async (req, res) => {
  try {
    const response = await fetch(`${TMDB_BASE}/trending/movie/week`, {
      headers: tmdbHeaders,
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TMDB request failed' })
    }

    const data = await response.json()
    res.json(data.results.slice(0, 40))

  } catch (error) {
    console.error('TMDB fetch error:', error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

router.get('/search', async (req, res) => {
  const { query } = req.query

  if (!query || query.trim().length < 2) {
    return res.json([])
  }

  try {
    const url = `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&include_adult=false`

    const response = await fetch(url, { headers: tmdbHeaders })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TMDB search failed' })
    }

    const data = await response.json()

    const films = data.results.slice(0, 8).map((film) => ({
      tmdbId: film.id,
      title: film.title,
      posterPath: film.poster_path,
      year: film.release_date ? film.release_date.slice(0, 4) : null,
    }))

    res.json(films)

  } catch (error) {
    console.error('TMDB search error:', error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

module.exports = router