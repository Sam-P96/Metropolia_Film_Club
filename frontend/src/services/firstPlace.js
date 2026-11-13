import { api } from './api'

// First Place (backend/routes/firstPlaceRouter.js): who's #1 on each ranking,
// and their name effect's settings.

// { titles: { pp, critics, controversial, level }, settings: { [userId]: fx } }:
// each title { userId, username, label } or null, and settings for each holder.
export function getFirstPlace() {
  return api('/first-place')
}

// A holder saving their effect settings. Resolves to { settings }; fails
// with 403 if they no longer hold any title.
export function saveFirstPlaceSettings(settings) {
  return api('/first-place/settings', { method: 'PUT', body: settings })
}
