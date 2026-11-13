import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'
import { getFirstPlace } from '../../services/firstPlace'
import { firstPlaceFxOf } from '../../../../shared/firstPlace/config.js'

// Who holds the First Place titles, for every name on the page at once:
// one GET /api/first-place, kept here and shared. A name that appears asks
// again if what's kept is older than STALE_MS, so a new #1 takes over at
// the next page or list that loads, without anyone pushing it.
const STALE_MS = 15000

let state = { data: null, at: 0, loading: null }
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

// Fetches again if it's stale (or `force`), once however many ask.
export function refreshFirstPlace({ force = false } = {}) {
  if (state.loading) return state.loading
  if (!force && state.at && Date.now() - state.at < STALE_MS) return Promise.resolve(state.data)

  const loading = getFirstPlace().then(
    (data) => {
      state = { data, at: Date.now(), loading: null }
      emit()
      return data
    },
    () => {
      // Try again next time a name appears; until then, plain names.
      state = { ...state, at: Date.now(), loading: null }
      emit()
      return state.data
    }
  )
  state = { ...state, loading }
  return loading
}

// After a holder saves: their new settings, straight away.
export function setFirstPlaceSettings(userId, settings) {
  if (!state.data) return
  state = { ...state, data: { ...state.data, settings: { ...state.data.settings, [userId]: settings } } }
  emit()
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const snapshot = () => state.data

// The developer test tool's made-up holders, instead of the real ones:
// { [userId]: { titles: ['#1 PP', ...], settings } }.
export const FirstPlacePreview = createContext(null)

// The labels of the titles `userId` holds ('#1 PP', ...), in title order.
function titlesOf(data, userId) {
  if (!data || !userId) return []
  return Object.values(data.titles ?? {})
    .filter((title) => title && title.userId === String(userId))
    .map((title) => title.label)
}

// `userId`'s First Place: { titles, settings } while they hold any title,
// or null. Without a userId (the shop's own previews) it's always null.
export function useFirstPlace(userId) {
  const preview = useContext(FirstPlacePreview)
  const data = useSyncExternalStore(subscribe, snapshot)
  const live = Boolean(userId) && !preview

  useEffect(() => {
    if (live) refreshFirstPlace()
  }, [live])

  if (!userId) return null
  if (preview) return preview[userId] ?? null

  const titles = titlesOf(data, userId)
  if (titles.length === 0) return null
  return { titles, settings: firstPlaceFxOf(data.settings?.[String(userId)]) }
}

// Whether `userId`'s name shows the First Place effect: they hold a title
// and have it on. The rows around a name use it to give the effect room,
// as they do for a Black Market name style.
export function useFirstPlaceShown(userId) {
  const firstPlace = useFirstPlace(userId)
  return Boolean(firstPlace?.settings.enabled)
}
