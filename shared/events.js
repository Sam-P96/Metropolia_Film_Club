// Site events that come round by the calendar, in Helsinki time: the Black
// Market's Black Friday Sale and Box Office Scratch's Double Prize Weekend.
// The server decides from these (what things cost and pay, and the
// notification everyone gets when one starts: backend/utils/siteEvents.js);
// the pages show them with the same sums.

export const EVENT_ZONE = 'Europe/Helsinki'

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

// The Helsinki calendar day `now` falls on, as "2026-11-27".
export const helsinkiDay = (now = new Date()) => dayFormat.format(now)

// A calendar day's weekday, 0 (Sunday) to 6 (Saturday), and the day `count`
// days on. Done at noon UTC, so no clock change can tip it into another day.
const weekdayOf = (day) => new Date(`${day}T12:00:00Z`).getUTCDay()
function addDays(day, count) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

// ---------- the Black Friday Sale ----------

// Everything in the Black Market at `discount` off (rounded up to a whole
// P-PP), except the `excluded` items: the Jackpot name style and border.
export const BLACK_FRIDAY = {
  discount: 0.5,
  excluded: ['name.jackpot', 'border.jackpot'],
}

// Black Friday in `year`: the day after the fourth Thursday of November.
export function blackFridayOf(year) {
  const firstThursday = 1 + ((4 - weekdayOf(`${year}-11-01`) + 7) % 7)
  return `${year}-11-${String(firstThursday + 22).padStart(2, '0')}`
}

// The sale at `now`: on from the start of Black Friday to the end of that
// Sunday, Helsinki time. `key` names this year's sale (its notification is
// sent once per key), `lastDay` is the Sunday.
export function blackFridaySale(now = new Date()) {
  const day = helsinkiDay(now)
  const first = blackFridayOf(Number(day.slice(0, 4)))
  const lastDay = addDays(first, 2)
  return { on: day >= first && day <= lastDay, key: `blackFriday-${first}`, lastDay }
}

// What `item` costs with the sale on (`on`) or off.
export function priceInSale(item, on) {
  if (!on || !item?.price || BLACK_FRIDAY.excluded.includes(item.id)) return item?.price ?? 0
  return Math.ceil(item.price * (1 - BLACK_FRIDAY.discount))
}

// What `item` costs at `now`.
export const salePrice = (item, now = new Date()) => priceInSale(item, blackFridaySale(now).on)

// ---------- Box Office Scratch's Double Prize Weekend ----------

// Every Saturday and Sunday, Helsinki time: a card bought then pays `times`
// its prize (a refund pays the ticket price back and once more in P-PP).
// The jackpots stay as they are.
export const DOUBLE_PRIZES = { times: 2 }

// The weekend at `now`. `key` names this weekend by its Saturday (its
// notification is sent once per key).
export function doublePrizeWeekend(now = new Date()) {
  const day = helsinkiDay(now)
  const weekday = weekdayOf(day)
  const saturday = weekday === 6 ? day : weekday === 0 ? addDays(day, -1) : null
  return { on: saturday !== null, key: saturday ? `doublePrizes-${saturday}` : null, lastDay: saturday ? addDays(saturday, 1) : null }
}
