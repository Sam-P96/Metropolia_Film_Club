import { useState } from 'react'

import useApi from './useApi'

// A list that loads a page at a time: the first page as soon as `deps` are
// set, then `loadMore()` fetches the next and adds its items on. Each page
// looks like { [itemsKey]: [...], hasMore, next }, where `next` is where the
// following page starts.
function usePagedList(loadPage, deps, itemsKey) {
  const first = useApi(() => loadPage(0), deps)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState(null)

  const loadMore = async () => {
    setLoadingMore(true)
    setMoreError(null)

    try {
      const page = await loadPage(first.data.next)
      first.setData((previous) => ({ ...page, [itemsKey]: [...previous[itemsKey], ...page[itemsKey]] }))
    } catch (err) {
      setMoreError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  return { ...first, loadingMore, moreError, loadMore }
}

export default usePagedList
