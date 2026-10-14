const express = require('express')

const router = express.Router()

const TMDB_BASE = 'https://api.themoviedb.org/3'

const tmdbHeaders = {
  Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
  accept: 'application/json',
}

// The genre list never changes, so fetch it once and keep it.
let genreCache = null

function toFilm(film) {
  return {
    tmdbId: film.id,
    title: film.title,
    posterPath: film.poster_path,
    year: film.release_date ? film.release_date.slice(0, 4) : null,
    overview: film.overview,
    tmdbRating: film.vote_average,
    tmdbVotes: film.vote_count,
    genreIds: film.genre_ids || [],
  }
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
  const { query, page = '1' } = req.query

  if (!query || query.trim().length < 2) {
    return res.json({ films: [], page: 1, totalPages: 0, totalResults: 0 })
  }

  try {
    const url =
      `${TMDB_BASE}/search/movie` +
      `?query=${encodeURIComponent(query)}` +
      `&page=${encodeURIComponent(page)}` +
      `&include_adult=false`

    const response = await fetch(url, { headers: tmdbHeaders })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TMDB search failed' })
    }

    const data = await response.json()

    res.json({
      films: data.results.map(toFilm),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    })

  } catch (error) {
    console.error('TMDB search error:', error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// Filters only — TMDB's Discover endpoint does not accept a text query.
// For text, the client calls /search instead.
router.get('/discover', async (req, res) => {
  const {
    studio,
    genres,
    excludeGenres,
    yearFrom,
    yearTo,
    certification,
    minRating,
    minVotes,
    runtimeMin,
    runtimeMax,
    language,
    sort = 'popularity.desc',
    page = '1',
  } = req.query

  try {
    const params = new URLSearchParams({
      sort_by: sort,
      page,
      include_adult: 'false',
      include_video: 'false',
      language: 'en-US',
    })

    if (studio) params.set('with_companies', studio)

    // Comma means AND on TMDB — a film must have every genre listed.
    if (genres) params.set('with_genres', genres)
    if (excludeGenres) params.set('without_genres', excludeGenres)

    if (yearFrom) params.set('primary_release_date.gte', `${yearFrom}-01-01`)
    if (yearTo) params.set('primary_release_date.lte', `${yearTo}-12-31`)

    if (certification) {
      params.set('certification_country', 'US')
      params.set('certification', certification)
    }

    if (minRating) params.set('vote_average.gte', minRating)

    if (runtimeMin) params.set('with_runtime.gte', runtimeMin)
    if (runtimeMax) params.set('with_runtime.lte', runtimeMax)

    if (language) params.set('with_original_language', language)

    // An explicit minimum wins. Otherwise, sorting by rating needs a floor or
    // page one is obscure films with three 10/10 votes.
    if (minVotes) {
      params.set('vote_count.gte', minVotes)
    } else if (sort.startsWith('vote_average')) {
      params.set('vote_count.gte', '200')
    }

    const response = await fetch(`${TMDB_BASE}/discover/movie?${params}`, {
      headers: tmdbHeaders,
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TMDB discover failed' })
    }

    const data = await response.json()

    res.json({
      films: data.results.map(toFilm),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    })

  } catch (error) {
    console.error('TMDB discover error:', error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

router.get('/genres', async (req, res) => {
  if (genreCache) {
    return res.json(genreCache)
  }

  try {
    const response = await fetch(`${TMDB_BASE}/genre/movie/list?language=en`, {
      headers: tmdbHeaders,
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TMDB genres failed' })
    }

    const data = await response.json()
    genreCache = data.genres

    res.json(genreCache)

  } catch (error) {
    console.error('TMDB genres error:', error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// Only used to look up studio ids while building data/studios.js.
router.get('/companies', async (req, res) => {
  const { query } = req.query

  if (!query || query.trim().length < 2) {
    return res.json([])
  }

  try {
    const url = `${TMDB_BASE}/search/company?query=${encodeURIComponent(query)}`
    const response = await fetch(url, { headers: tmdbHeaders })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TMDB company search failed' })
    }

    const data = await response.json()

    res.json(
      data.results.slice(0, 10).map((company) => ({
        id: company.id,
        name: company.name,
        country: company.origin_country,
      }))
    )

  } catch (error) {
    console.error('TMDB company search error:', error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

router.get('/movie/:id', async (req, res) => {
  const { id } = req.params

  try {
    const response = await fetch(`${TMDB_BASE}/movie/${id}?language=en-US`, {
      headers: tmdbHeaders,
    })

    if (response.status === 404) {
      return res.status(404).json({ error: 'Film not found' })
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TMDB request failed' })
    }

    const film = await response.json()

    res.json({
      tmdbId: film.id,
      title: film.title,
      tagline: film.tagline || null,
      year: film.release_date ? film.release_date.slice(0, 4) : null,
      posterPath: film.poster_path,
      backdropPath: film.backdrop_path,
      overview: film.overview,
      runtime: film.runtime,
      genres: (film.genres || []).map((genre) => genre.name),
      studios: (film.production_companies || []).map((company) => company.name),
      tmdbRating: film.vote_average,
      tmdbVotes: film.vote_count,
    })

  } catch (error) {
    console.error('TMDB movie error:', error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

module.exports = router