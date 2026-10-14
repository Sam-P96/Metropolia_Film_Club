import { Link } from 'react-router-dom'

import {
  formatEventTime,
  formatShortDate,
} from '../../utils/eventDates'
import { googleCalendarUrl } from '../../utils/googleCalendar'

// Shared by the club events page and the all-events page, so the two can't
// drift apart.
function EventListItem({ event, past = false }) {
  return (
    <li
      className={`border-l-2 pl-4 ${
        past ? 'border-white/10' : 'border-brand-gold/40'
      }`}
    >
      <p
        className={`text-xs tracking-wider uppercase ${
          past ? 'text-white/30' : 'text-brand-gold'
        }`}
      >
        {formatShortDate(event.startsAt)} · {formatEventTime(event.startsAt)}
      </p>

      <p className={`mt-1 font-semibold ${past ? 'text-white/50' : ''}`}>
        <Link
          to={`/club_events/${event._id}`}
          className="transition-colors hover:text-brand-gold"
        >
          {event.title}
        </Link>
      </p>

      <p className="mt-1 text-sm text-white/50">{event.location}</p>

      {past ? null : (
        <a
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block py-2 text-sm font-medium text-brand-gold transition-colors hover:text-white"
        >
          + Add to Google Calendar
        </a>
      )}
    </li>
  )
}

export default EventListItem