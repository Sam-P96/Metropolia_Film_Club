import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  WEEKDAY_LABELS,
  dayKey,
  formatEventTime,
  formatMonth,
  getMonthCells,
} from '../../utils/eventDates'
import { googleCalendarUrl } from '../../utils/googleCalendar'

function EventCalendar({ events }) {
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null)

  const cells = getMonthCells(year, month)
  const todayKey = dayKey(today)

  // Bucket the events by Helsinki day so each cell is a single lookup
  // instead of a scan through every event.
  const byDay = {}
  events.forEach((event) => {
    const key = dayKey(event.startsAt)
    byDay[key] = byDay[key] ? [...byDay[key], event] : [event]
  })

  const step = (delta) => {
    // Day 1 of month ± 1 — JavaScript rolls the year over for us, so
    // December + 1 becomes January of the next year with no special case.
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
    setSelected(null)
  }

  const selectedEvents = selected ? (byDay[selected] ?? []) : []

  const arrowClasses =
    'flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white'

  return (
    <div className="rounded-2xl border border-white/10 bg-ink/60 p-5 backdrop-blur-xl">

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} aria-label="Previous month" className={arrowClasses}>
          ‹
        </button>

        <p className="text-sm font-semibold tracking-wide">
          {formatMonth(year, month)}
        </p>

        <button type="button" onClick={() => step(1)} aria-label="Next month" className={arrowClasses}>
          ›
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <p key={label} className="pb-2 text-[10px] tracking-wider text-white/30 uppercase">
            {label}
          </p>
        ))}

        {cells.map((cell, index) => {
          if (!cell) {
            // Empty slot before the 1st. The index is the only unique thing
            // about it, which is the one case where an index key is correct.
            return <div key={`blank-${index}`} />
          }

          const dayEvents = byDay[cell.key] ?? []
          const hasEvents = dayEvents.length > 0
          const isToday = cell.key === todayKey
          const isSelected = cell.key === selected

          if (!hasEvents) {
            return (
              <div
                key={cell.key}
                className={`flex aspect-square items-center justify-center rounded-md text-sm ${
                  isToday ? 'text-white ring-1 ring-white/30' : 'text-white/35'
                }`}
              >
                {cell.day}
              </div>
            )
          }

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelected(isSelected ? null : cell.key)}
              aria-pressed={isSelected}
              title={dayEvents.map((event) => event.title).join(', ')}
              className={`flex aspect-square items-center justify-center rounded-md text-sm font-semibold transition-colors ${
                isSelected
                  ? 'bg-brand-gold text-ink'
                  : 'bg-brand-gold/15 text-brand-gold hover:bg-brand-gold/30'
              }`}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      {selectedEvents.length > 0 && (
        <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
          {selectedEvents.map((event) => (
            <div key={event._id}>
              <Link
                to={`/club_events/${event._id}`}
                className="text-sm font-semibold transition-colors hover:text-brand-gold"
              >
                {event.title}
              </Link>
              <p className="mt-1 text-xs text-white/50">
                {formatEventTime(event.startsAt)} · {event.location}
              </p>
              <a
                href={googleCalendarUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-medium text-brand-gold transition-colors hover:text-white"
              >
                Add to Google Calendar
              </a>
            </div>
          ))}
        </div>
      )}

      {!selected && (
        <p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/30">
          Gold days have something on. Tap one for the details.
        </p>
      )}
    </div>
  )
}

export default EventCalendar