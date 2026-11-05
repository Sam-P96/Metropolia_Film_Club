import { SCRATCH } from './config.js'

// Box Office Scratch's ticket types (config.js ticketTypes): looking one up,
// what its tiers pay, and when it's on sale. Shared by the server and the
// page, like config.js. `s` is only ever passed by odds.js and the tests, to
// try other numbers.

// The type keys, in the order the page lists them, and the type of anything
// that doesn't say: cards, jackpot wins and notifications from before there
// were ticket types were all Standard.
export const TICKET_TYPES = Object.keys(SCRATCH.ticketTypes)
export const DEFAULT_TICKET_TYPE = 'standard'

export const isTicketType = (key, s = SCRATCH) => typeof key === 'string' && Object.hasOwn(s.ticketTypes, key)

// The ticket type of a card, a jackpot win or a notification.
export const ticketTypeOf = (item) => (isTicketType(item?.ticketType) ? item.ticketType : DEFAULT_TICKET_TYPE)

// A type's settings, with its `key`. An unknown key gets the default type,
// so callers that take a key from outside check it with isTicketType first.
export function ticketType(key, s = SCRATCH) {
  const found = isTicketType(key, s) ? key : DEFAULT_TICKET_TYPE
  return { key: found, ...s.ticketTypes[found] }
}

// The tiers as `key`'s tickets pay them: config.js's tiers, each with `ppp`
// (null for the refund) and `refund`. A type missing a prize throws, so a
// slip in config.js shows up at once, not in the middle of someone's card.
const tierCache = new Map()
export function ticketTiers(key, s = SCRATCH) {
  const type = ticketType(key, s)
  if (s === SCRATCH && tierCache.has(type.key)) return tierCache.get(type.key)

  const tiers = s.tiers.map((tier) => {
    const prize = type.prizes?.[tier.scratch]
    if (!prize || (!prize.refund && !Number.isFinite(prize.ppp))) {
      throw new Error(`Box Office Scratch: the ${type.name} ticket has no prize for scratch ${tier.scratch} (shared/scratch/config.js)`)
    }
    return Object.freeze({ ...tier, ppp: prize.refund ? null : prize.ppp, refund: Boolean(prize.refund) })
  })

  if (s === SCRATCH) tierCache.set(type.key, tiers)
  return tiers
}

// ---- Opening hours ----

// "16:00" -> minutes since midnight (960). "24:00" is 1440.
function minutesOf(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// What the clocks in `timeZone` show at `date`: { year, month, day, hour,
// minute, second }, month 1 to 12. One formatter per time zone: making them
// is slow, using them isn't.
const formatters = new Map()
function wallClock(date, timeZone) {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(timeZone, format)
  }
  const clock = {}
  for (const { type, value } of format.formatToParts(date)) {
    if (type !== 'literal') clock[type] = Number(value)
  }
  return clock
}

// How far ahead of UTC the clocks in `timeZone` are at `date`, in ms
// (three hours on a Helsinki summer's day, two in winter).
function zoneOffset(date, timeZone) {
  const c = wallClock(date, timeZone)
  return Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second) - Math.floor(date.getTime() / 1000) * 1000
}

// The moment the clocks in `timeZone` show `minutes` past midnight on `day`
// ({ year, month, day }). The day can run past the end of the month and the
// minutes past 1440: Date.UTC rolls them over. Measured twice, so a change
// of daylight saving time between the guess and the answer can't throw it.
function zonedMoment(day, minutes, timeZone) {
  const asUtc = Date.UTC(day.year, day.month - 1, day.day, 0, minutes)
  const first = asUtc - zoneOffset(new Date(asUtc), timeZone)
  return new Date(asUtc - zoneOffset(new Date(first), timeZone))
}

const ALWAYS_OPEN = Object.freeze({ open: true, opensAt: null, closesAt: null })

// Whether `key`'s tickets are on sale at `now`, and when that next changes:
// { open, opensAt, closesAt } (Dates). Shut, `opensAt` is when it opens next;
// open, `closesAt` is when it closes. Both null for a type that's always on
// sale. Worked out on the clocks of the type's own time zone, so the hours
// move with daylight saving time like everyone's clocks do.
export function ticketHours(key, now = new Date(), s = SCRATCH) {
  const { hours } = ticketType(key, s)
  if (!hours) return ALWAYS_OPEN

  const opens = minutesOf(hours.opens)
  const closes = minutesOf(hours.closes)
  if (opens === closes) return ALWAYS_OPEN

  const clock = wallClock(now, hours.timeZone)
  const minute = clock.hour * 60 + clock.minute + (clock.second + now.getUTCMilliseconds() / 1000) / 60
  const today = { year: clock.year, month: clock.month, day: clock.day }
  const tomorrow = { ...today, day: today.day + 1 }

  // Hours like 22:00 to 02:00 run past midnight.
  const overnight = opens > closes
  const open = overnight ? minute >= opens || minute < closes : minute >= opens && minute < closes

  if (open) {
    const day = overnight && minute >= opens ? tomorrow : today
    return { open, opensAt: null, closesAt: zonedMoment(day, closes, hours.timeZone) }
  }
  const day = !overnight && minute >= closes ? tomorrow : today
  return { open, opensAt: zonedMoment(day, opens, hours.timeZone), closesAt: null }
}

// "from 16:00 to midnight, Helsinki time", for the page and for the
// server's answer to someone buying out of hours.
export function describeHours(hours) {
  if (!hours) return 'all day'
  const clock = (time) => (time === '24:00' || time === '00:00' ? 'midnight' : time)
  const place = hours.timeZone.split('/').pop().replaceAll('_', ' ')
  return `from ${clock(hours.opens)} to ${clock(hours.closes)}, ${place} time`
}
