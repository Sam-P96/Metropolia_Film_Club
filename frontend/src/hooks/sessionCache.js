import { useEffect, useSyncExternalStore } from 'react'
import { LOGIN_EXPIRED_EVENT, getCurrentUserId } from '../utils/currentUser'

// Something about the logged-in member that lots of components on a page
// need (who their friends are, their Soul Resonances): one answer shared by
// all of them, rather than a request each. It's asked for again on a new
// page once it's `maxAgeMs` old, on the next page if asking failed, and
// straight away after refresh(). `empty` stands in for it for logged-out
// visitors and while it first loads.
//
//   const friends = sessionCache(getFriends, { maxAgeMs, empty: new Set() })
//   friends.useValue()   in a component: the answer, kept up to date
//   friends.refresh()    after something changes it
//   friends.peek()       the answer as it is, outside a component
export function sessionCache(load, { maxAgeMs, empty }) {
  // `at` is when it was last asked for, `asking` whose answer is on its way.
  const store = { userId: null, value: empty, at: 0, asking: null }
  const listeners = new Set()

  const emit = () => listeners.forEach((listener) => listener())

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function ask(userId) {
    store.asking = userId
    store.at = Date.now()

    load()
      .then((value) => {
        // Someone else may have logged in since.
        if (store.userId !== userId) return
        store.value = value ?? empty
        emit()
      })
      .catch(() => {
        // Ask again on the next page.
        if (store.userId === userId) store.at = 0
      })
      .finally(() => {
        if (store.asking === userId) store.asking = null
      })
  }

  // Makes sure `userId`'s answer is there and not too old. Another
  // member's is dropped at once.
  function check(userId) {
    if (store.userId !== userId) {
      store.userId = userId
      store.value = empty
      store.at = 0
      emit()
    }

    if (!userId || store.asking === userId || Date.now() - store.at < maxAgeMs) return
    ask(userId)
  }

  window.addEventListener(LOGIN_EXPIRED_EVENT, () => check(null))

  function refresh() {
    store.at = 0
    check(getCurrentUserId())
  }

  function peek() {
    return store.userId === getCurrentUserId() ? store.value : empty
  }

  function useValue() {
    const userId = getCurrentUserId()

    // Each component that appears checks, so a new page asks again once
    // the answer is old.
    useEffect(() => {
      check(userId)
    }, [userId])

    return useSyncExternalStore(subscribe, () => (store.userId === userId ? store.value : empty))
  }

  return { useValue, refresh, peek }
}
