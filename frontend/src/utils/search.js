// Lowercased with accents stripped, so "pitazamantie" finds "Pitäzamäntie"
// and "amelie" finds "Amélie". NFD splits "ä" into "a" + a combining mark,
// and the regex throws the marks away.
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// An empty query matches everything, so a page with no ?q= shows its full list.
function matches(fields, query) {
  const needle = normalize(query)
  if (!needle) return true

  return fields.some((field) => normalize(field).includes(needle))
}

export function searchEvents(events, query) {
  return events.filter((event) =>
    matches(
      [event.title, event.location, event.description, event.film?.title],
      query
    )
  )
}

export function searchUsers(users, query) {
  return users.filter((user) => matches([user.username, user.memberTitle], query))
}

// Where each search lands. Kept here so the nav dropdown and the /search
// page can't disagree about it.
export function searchPageUrl(q) {
  return `/search?q=${encodeURIComponent(q)}`
}

export function filmsPageUrl(q) {
  return `/films?mode=search&q=${encodeURIComponent(q)}`
}

export function eventsPageUrl(q, hash = '') {
  return `/club_events/all?q=${encodeURIComponent(q)}${hash}`
}

export function membersPageUrl(q) {
  return `/members?q=${encodeURIComponent(q)}`
}
