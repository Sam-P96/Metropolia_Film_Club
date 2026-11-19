import { api } from './api'

// First Place (backend/routes/firstPlaceRouter.js): who's #1 on each ranking,
// and their name effect's settings; who holds each Infinity Stone; and which
// name effect each of them shows.

// { titles: { pp, critics, controversial, level }, settings: { [userId]: fx },
// stones: { space, mind, reality, power, time, soul }, chosen: { [userId]: effect } }:
// each title { userId, username, label } or null, settings for each holder,
// each stone's holder's id or null, and the name effect each holder picked.
export function getFirstPlace() {
  return api('/first-place')
}

// A holder saving their effect settings. Resolves to { settings }; fails
// with 403 if they no longer hold any title.
export function saveFirstPlaceSettings(settings) {
  return api('/first-place/settings', { method: 'PUT', body: settings })
}

// Picking which name effect shows: 'firstPlace' or a stone id
// (shared/stoneNames/config.js). Resolves to { effect }; fails with 403 if
// they no longer have it.
export function saveNameEffect(effect) {
  return api('/first-place/name-effect', { method: 'PUT', body: { effect } })
}
