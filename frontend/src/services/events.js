import { api, cachedApi, clearCache } from './api'

// Every event, soonest first. Shared by the calendar, lists, nav search
// and "next event" block, which are often on screen together.
export function getEvents() {
  return cachedApi('/events')
}

// The event, plus who's attending and interested:
// { ..., attending: [user], interested: [user], attendingCount, interestedCount, myRsvp }
export function getEvent(id) {
  return api(`/events/${encodeURIComponent(id)}`)
}

// The Attend / Interested buttons. rsvp is 'attending', 'interested' or null.
// Resolves to the new { attending, interested, attendingCount, interestedCount, myRsvp }.
export function setEventRsvp(id, rsvp) {
  return api(`/events/${encodeURIComponent(id)}/rsvp`, { method: 'PUT', body: { rsvp } })
}

// Moderators and admins only for these three; the server checks.
export async function createEvent(event) {
  const created = await api('/events', { method: 'POST', body: event })
  clearCache('/events')
  return created
}

// Sends the whole event, the same shape as createEvent.
export async function updateEvent(id, event) {
  const updated = await api(`/events/${encodeURIComponent(id)}`, { method: 'PUT', body: event })
  clearCache('/events')
  return updated
}

export async function deleteEvent(id) {
  await api(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
  clearCache('/events')
}
