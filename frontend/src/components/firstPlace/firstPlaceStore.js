import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'
import { getFirstPlace } from '../../services/firstPlace'
import { firstPlaceFxOf } from '../../../../shared/firstPlace/config.js'
import { STONE_NAME_IDS, nameEffectOptions, shownNameEffect } from '../../../../shared/stoneNames/config.js'

// Who holds the First Place titles and the Infinity Stones, for every name
// on the page at once: one GET /api/first-place, kept here and shared. A
// name that appears asks again if what's kept is older than STALE_MS, so a
// new #1 (or a stone changing hands) takes over at the next page or list
// that loads, without anyone pushing it.
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

// After a member picks which name effect shows: theirs, straight away.
export function setNameEffectChoice(userId, effect) {
  if (!state.data) return
  state = { ...state, data: { ...state.data, chosen: { ...state.data.chosen, [userId]: effect } } }
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

// Every name effect `userId` has (shared/stoneNames/config.js): {
// firstPlace (as useFirstPlace), stones (the stone ids they hold), options
// (the effects they can show, in order), effect (the one that shows, or
// null) }, or null if they hold no title and no stone. The developer test
// tool's made-up holders have First Place only.
export function useNameEffect(userId) {
  const firstPlace = useFirstPlace(userId)
  const preview = useContext(FirstPlacePreview)
  const data = useSyncExternalStore(subscribe, snapshot)
  if (!userId) return null

  const id = String(userId)
  const stones = preview ? [] : STONE_NAME_IDS.filter((stone) => data?.stones?.[stone] === id)
  if (!firstPlace && stones.length === 0) return null

  const on = Boolean(firstPlace?.settings.enabled)
  const chosen = preview ? null : (data?.chosen?.[id] ?? null)
  return {
    firstPlace,
    stones,
    options: nameEffectOptions({ stones, firstPlace: on }),
    effect: shownNameEffect({ stones, firstPlace: on, chosen }),
  }
}

// Whether `userId`'s name shows a name effect (First Place's or a
// stone's) in place of their Black Market name style. The rows around a
// name use it to give the effect room, as they do for a name style.
export function useNameEffectShown(userId) {
  return Boolean(useNameEffect(userId)?.effect)
}
