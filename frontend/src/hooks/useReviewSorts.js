import { useState } from 'react'

import useApi from './useApi'
import { getReviews } from '../services/films'
import { getCurrentUser } from '../utils/currentUser'

const TITLES = {
  recent: 'Recent Reviews',
  top: 'Top Reviews',
  controversial: 'Controversial Reviews',
  shuffle: 'Shuffled Reviews',
  recommend: 'Recommended for You',
}

// The toggle's options, in order. Recommend is for logged-in members only.
const SORTS = [
  { value: 'recent', label: 'Recent' },
  { value: 'top', label: 'Top' },
  { value: 'controversial', label: 'Controversial' },
  { value: 'shuffle', label: 'Shuffle' },
  { value: 'recommend', label: 'Recommend', loggedIn: true },
]

// The two that draw a new random set (backend controllers/filmController.js
// getReviews, utils/recommend.js).
const RANDOM = ['shuffle', 'recommend']

// The reviews behind the Recent / Top / Controversial / Shuffle / Recommend
// toggle, for ReviewSection. The first three load up front, so the toggle
// switches straight away. Shuffle and Recommend load when they're picked,
// and draw a new set every time they are, even when picked again: `draws`
// counts the picks.
//
// Until a picked list is in, the one before it stays (`loading` says it's
// on its way), so the section never empties and changes size in between:
// a list drawn again keeps its last set (keepPrevious), and one picked for
// the first time keeps showing the list it was picked from (`from`).
function useReviewSorts(limit) {
  const [sort, setSortState] = useState('recent')
  const [from, setFrom] = useState(null)
  const [draws, setDraws] = useState({ shuffle: 0, recommend: 0 })
  const loggedIn = Boolean(getCurrentUser())
  const keep = { keepPrevious: true }

  const lists = {
    recent: useApi(() => getReviews(limit, 'recent'), [limit], keep),
    top: useApi(() => getReviews(limit, 'top'), [limit], keep),
    controversial: useApi(() => getReviews(limit, 'controversial'), [limit], keep),
    shuffle: useApi(() => getReviews(limit, 'shuffle'), [limit, draws.shuffle], { ...keep, enabled: draws.shuffle > 0 }),
    recommend: useApi(() => getReviews(limit, 'recommend'), [limit, draws.recommend], {
      ...keep,
      enabled: loggedIn && draws.recommend > 0,
    }),
  }

  // Logged out (say, after logging out on this page), Recommend falls back
  // to Recent.
  const picked = sort === 'recommend' && !loggedIn ? 'recent' : sort
  const shown = lists[picked].data === undefined && from && lists[from].data !== undefined ? from : picked
  const current = lists[shown]

  const setSort = (next) => {
    if (RANDOM.includes(next)) setDraws((previous) => ({ ...previous, [next]: previous[next] + 1 }))
    setFrom(shown)
    setSortState(next)
  }

  return {
    sort: picked,
    setSort,
    options: SORTS.filter((option) => loggedIn || !option.loggedIn),
    title: TITLES[shown],
    reviews: current.data ?? [],
    loading: lists[picked].loading,
  }
}

export default useReviewSorts
