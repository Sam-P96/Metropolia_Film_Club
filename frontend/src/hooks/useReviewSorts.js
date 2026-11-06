import { useState } from 'react'

import useApi from './useApi'
import { getReviews } from '../services/films'
import { getCurrentUser } from '../utils/currentUser'

const TITLES = {
  featured: 'Featured Reviews',
  recent: 'Recent Reviews',
  top: 'Top Reviews',
  controversial: 'Controversial Reviews',
}

// The toggle's options, in order. Featured is the default.
const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'recent', label: 'Recent' },
  { value: 'top', label: 'Top' },
  { value: 'controversial', label: 'Controversial' },
]

// The reviews behind the Featured / Recent / Top / Controversial toggle, for
// ReviewSection. All of them load up front, so the toggle switches straight
// away. Featured is mostly
// the newest, the rest picked for the member, or the most liked when logged
// out (backend utils/recommend.js featuredReviewIds): a new mix each time
// the page loads, and again on logging in or out.
//
// Until a picked list is in, the one before it stays (`loading` says it's
// on its way), so the section never empties and changes size in between.
function useReviewSorts(limit) {
  const [sort, setSortState] = useState('featured')
  const [from, setFrom] = useState(null)
  const loggedIn = Boolean(getCurrentUser())
  const keep = { keepPrevious: true }

  const lists = {
    featured: useApi(() => getReviews(limit, 'featured'), [limit, loggedIn], keep),
    recent: useApi(() => getReviews(limit, 'recent'), [limit], keep),
    top: useApi(() => getReviews(limit, 'top'), [limit], keep),
    controversial: useApi(() => getReviews(limit, 'controversial'), [limit], keep),
  }

  const shown = lists[sort].data === undefined && from && lists[from].data !== undefined ? from : sort
  const current = lists[shown]

  const setSort = (next) => {
    setFrom(shown)
    setSortState(next)
  }

  return {
    sort,
    setSort,
    options: SORTS,
    title: TITLES[shown],
    reviews: current.data ?? [],
    loading: lists[sort].loading,
  }
}

export default useReviewSorts
