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

// "Enter seat" at a theatre screening, for the member asking (who must be
// attending). Each attending member in the result has `seat`: { row, seat }
// or null. Resolves to the new attendance, like setEventRsvp.
export function setMySeat(id, row, seat) {
  return api(`/events/${encodeURIComponent(id)}/seat`, { method: 'PUT', body: { row, seat } })
}

// Moderators and admins. Resolves to the new attendance.
export function removeSeat(id, userId) {
  return api(`/events/${encodeURIComponent(id)}/seats/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}

// Any logged-in member. A member's event is a member screening; a
// moderator's is official if `official` is true. The server decides.
export async function createEvent(event) {
  const created = await api('/events', { method: 'POST', body: event })
  clearCache('/events')
  return created
}

// Editing and deleting: moderators and admins, or the member who made it
// while it's a member screening. The server checks.
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

// The Promote button, for whoever can edit the event: sends it to the top
// of members' Notifications again (every member for a club event, the
// host's followers for a member screening). Resolves to { sentTo }, how
// many members it went to.
export function repostEvent(id) {
  return api(`/events/${encodeURIComponent(id)}/repost`, { method: 'POST' })
}

// Moderators and admins: promote a member screening to an official club
// event (true), or demote it back (false). Resolves to { official }.
export async function setEventOfficial(id, official) {
  const result = await api(`/events/${encodeURIComponent(id)}/official`, {
    method: 'PUT',
    body: { official },
  })
  clearCache('/events')
  return result
}
