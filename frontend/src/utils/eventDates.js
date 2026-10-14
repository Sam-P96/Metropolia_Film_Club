export const TIME_ZONE = 'Europe/Helsinki'

// Finland starts the week on Monday, not Sunday.
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function getUpcomingEvents(events, limit = Infinity) {
  const now = new Date()

  return [...events]
    .filter((event) => new Date(event.startsAt) > now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .slice(0, limit)
}

// Most recent first — the reverse of upcoming.
export function getPastEvents(events, limit = Infinity) {
  const now = new Date()

  return [...events]
    .filter((event) => new Date(event.startsAt) <= now)
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
    .slice(0, limit)
}

// 'en-CA' is the one locale that formats as YYYY-MM-DD, which compares and
// sorts correctly as a plain string. This answers "which Helsinki day is this
// timestamp on", which is not the same as the viewer's own day.
export function dayKey(input) {
  return new Date(input).toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
}

// The same key built straight from numbers, for calendar cells. Going through
// a Date here would re-introduce the time zone problem we just solved.
export function cellKey(year, month, day) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function formatEventDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  })
}

export function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TIME_ZONE,
  })
}

export function formatEventTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  })
}

export function formatMonth(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

// One month's worth of grid cells, Monday first. null = an empty slot before
// the 1st lands on its weekday.
export function getMonthCells(year, month) {
  // Day 0 of the NEXT month is the last day of this one.
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // getDay() returns 0 for Sunday. (+6) % 7 rotates it so Monday is 0.
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7

  const cells = Array.from({ length: leadingBlanks }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, key: cellKey(year, month, day) })
  }

  return cells
}