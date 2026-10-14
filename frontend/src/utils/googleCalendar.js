// Events only store a start time, so assume a film plus a chat afterwards.
const DEFAULT_DURATION_MINUTES = 120

// Google wants 20260925T160000Z — an ISO string with the punctuation and
// milliseconds stripped out, always in UTC.
function toGoogleStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function googleCalendarUrl(event) {
  const start = new Date(event.startsAt)
  const end = event.endsAt
    ? new Date(event.endsAt)
    : new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toGoogleStamp(start)}/${toGoogleStamp(end)}`,
    details: event.description ?? '',
    location: event.location ?? '',
  })

  return `https://calendar.google.com/calendar/render?${params}`
}