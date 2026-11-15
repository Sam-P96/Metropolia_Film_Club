import { api } from './api'

// The Club Wheel (Club Events page). Every call resolves to the whole wheel
// as this member sees it:
//   { entries: [{ id, title, weight }], open, memberWeight, maxWeight,
//     you: { canAdd, canEdit, canManage, weightLeft },
//     activity: [{ id, action, title, weight, user, at }] }
// weightLeft and memberWeight are null for "no limit".
export function getClubWheel() {
  return api('/wheel')
}

// Moderators and admins, or any member while it's open. A film already on
// the wheel gets the weight added to it.
export function addToClubWheel(title, weight) {
  return api('/wheel', { method: 'POST', body: { title, weight } })
}

// Moderators and admins.
export function setClubWheelWeight(id, weight) {
  return api(`/wheel/${encodeURIComponent(id)}`, { method: 'PATCH', body: { weight } })
}

export function removeFromClubWheel(id) {
  return api(`/wheel/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function clearClubWheel() {
  return api('/wheel', { method: 'DELETE' })
}

// Admins: { open } and/or { memberWeight } (null for no limit).
export function setClubWheelSettings(changes) {
  return api('/wheel/settings', { method: 'PUT', body: changes })
}
