import { useCallback, useEffect, useState } from 'react'

// Loads something from the API and re-loads it when `deps` change.
//
//   const { data, error, loading } = useApi(() => getEvent(id), [id])
//
// Pass { enabled: false } to wait (e.g. until someone is logged in).
// setData swaps in a fresh copy after a save, without another request.
function useApi(load, deps, { enabled = true } = {}) {
  const key = enabled ? JSON.stringify(deps) : null
  const [version, setVersion] = useState(0)

  // Remembers which deps this result belongs to, so "loading" is just
  // "the result is for different deps". No state to reset by hand.
  const [state, setState] = useState({ key: null, data: undefined, error: null })

  useEffect(() => {
    if (key === null) return

    let cancelled = false

    load().then(
      (data) => {
        if (!cancelled) setState({ key, data, error: null })
      },
      (error) => {
        if (!cancelled) setState({ key, data: undefined, error })
      }
    )

    // An answer for the old id must not land after we've moved to a new one.
    return () => {
      cancelled = true
    }
    // `load` is a new function every render; the caller's deps (in `key`)
    // are what decide when to fetch again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])

  const current = state.key === key

  const setData = useCallback(
    (update) =>
      setState((previous) => ({
        ...previous,
        data: typeof update === 'function' ? update(previous.data) : update,
      })),
    []
  )

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    loading: key !== null && !current,
    setData,
    reload,
  }
}

export default useApi
