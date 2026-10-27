import { useState } from 'react'

import useApi from './useApi'
import { getReviews } from '../services/films'

const TITLES = {
  recent: 'Recent Reviews',
  top: 'Top Reviews',
  controversial: 'Controversial Reviews',
}

// The reviews behind a Recent / Top / Controversial toggle, for ReviewSection.
// All three lists load up front, so the toggle switches straight away.
function useReviewSorts(limit) {
  const [sort, setSort] = useState('recent')

  const lists = {
    recent: useApi(() => getReviews(limit, 'recent'), [limit]),
    top: useApi(() => getReviews(limit, 'top'), [limit]),
    controversial: useApi(() => getReviews(limit, 'controversial'), [limit]),
  }

  const current = lists[sort]

  return {
    sort,
    setSort,
    title: TITLES[sort],
    reviews: current.data ?? [],
    loading: current.loading,
  }
}

export default useReviewSorts
