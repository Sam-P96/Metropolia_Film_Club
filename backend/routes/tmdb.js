import express from 'express'

const router = express.Router()

const TMDB_BASE = 'https://api.themoviedb.org/3'

router.get('/trending', async (req, res) => {
  try {
    const response = await fetch(`${TMDB_BASE}/trending/movie/week`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
        accept: 'application/json',
      },
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

export default router