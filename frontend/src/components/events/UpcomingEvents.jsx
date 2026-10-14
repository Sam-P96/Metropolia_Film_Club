import { useState } from 'react'
import { Link } from 'react-router-dom'

import EventCalendar from './EventCalendar'
import EventListItem from './EventListItem'
import { getUpcomingEvents } from '../../utils/eventDates'
import { getCurrentUser } from '../../utils/currentUser'
import { canCreateEvents } from '../../utils/permissions'
import { getEvents } from '../../services/events'
import useApi from '../../hooks/useApi'

const MAX_LISTED = 3

function UpcomingEvents() {
  const [currentUser] = useState(getCurrentUser)
  const canCreate = canCreateEvents(currentUser)

  const { data: events = [], loading, error } = useApi(getEvents, [])

  const upcoming = getUpcomingEvents(events)
  const listed = upcoming.slice(0, MAX_LISTED)
  const hasMore = upcoming.length > MAX_LISTED

  return (
    <section className="border-b border-white/10 text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">

          {/* left: the list. On a phone this IS the calendar. */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
                Upcoming events
              </h2>

              {canCreate && (
                <Link
                  to="/club_events/new"
                  className="rounded-md border border-brand-gold/60 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10"
                >
                  + Create event
                </Link>
              )}
            </div>

            <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

            {listed.length === 0 ? (
              <p className="text-white/50">
                {loading
                  ? 'Loading events…'
                  : error
                    ? "Couldn't load events. Try refreshing the page."
                    : "Nothing on the calendar yet. We're working on it."}
              </p>
            ) : (
              <ul className="space-y-5">
                {listed.map((event) => (
                  <EventListItem key={event._id} event={event} />
                ))}
              </ul>
            )}

            {hasMore && (
              <Link
                to="/club_events/all"
                className="mt-8 inline-block font-medium text-brand-gold transition-colors hover:text-white"
              >
                See all events ({upcoming.length}) →
              </Link>
            )}
          </div>

          {/* right: the month grid, desktop only — on a phone it would just
              repeat the list above in a harder-to-read form */}
          <div className="hidden lg:block">
            <EventCalendar events={events} />
          </div>

        </div>
      </div>
    </section>
  )
}

export default UpcomingEvents