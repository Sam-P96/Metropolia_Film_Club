import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import events from '../data/events'
import users from '../data/users'
import EventListItem from '../components/events/EventListItem'
import EventCalendar from '../components/events/EventCalendar'
import { getPastEvents, getUpcomingEvents } from '../utils/eventDates'
import { getCurrentUser } from '../utils/currentUser'
import { canCreateEvents } from '../utils/permissions'
import { searchEvents } from '../utils/search'

function AllEvents() {
  const [currentUser] = useState(getCurrentUser)
  const canCreate = canCreateEvents(users, currentUser)

  // ?q= comes from "Show all results" in the nav search.
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').trim()

  const upcoming = searchEvents(getUpcomingEvents(events), query)
  const past = searchEvents(getPastEvents(events), query)

  // "Show all results in Past events" links to #past. The router doesn't
  // scroll to hashes on its own, so do it once the list has rendered.
  const { hash } = useLocation()
  useEffect(() => {
    if (hash === '#past') {
      document.getElementById('past')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">

        <Link
          to="/club_events"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Back to club events
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold sm:text-5xl">
            All <span className="text-brand-gold">events</span>
          </h1>

          {canCreate && (
            <Link
              to="/club_events/new"
              className="rounded-md border border-brand-gold/60 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10"
            >
              + Create event
            </Link>
          )}
        </div>

        <div className="mt-4 mb-10 h-1 w-10 rounded-full bg-brand-gold" />

        {query && (
          <p className="-mt-4 mb-10 text-sm text-white/60">
            Showing events matching “{query}”.{' '}
            <Link
              to="/club_events/all"
              className="font-medium text-brand-gold transition-colors hover:text-white"
            >
              Clear search
            </Link>
          </p>
        )}

        <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-14">

          <div className="space-y-12">
            <div>
              <h2 className="mb-6 text-sm font-semibold tracking-widest text-brand-gold uppercase">
                Coming up ({upcoming.length})
              </h2>

              {upcoming.length === 0 ? (
                <p className="text-white/50">
                  {query ? 'No upcoming events match.' : 'Nothing planned right now.'}
                </p>
              ) : (
                <ul className="space-y-5">
                  {upcoming.map((event) => (
                    <EventListItem key={event._id} event={event} />
                  ))}
                </ul>
              )}
            </div>

            {/* scroll-mt keeps the heading clear of the sticky nav bar */}
            <div id="past" className="scroll-mt-28">
              <h2 className="mb-6 text-sm font-semibold tracking-widest text-white/40 uppercase">
                Already happened ({past.length})
              </h2>

              {past.length === 0 ? (
                <p className="text-white/50">
                  {query ? 'No past events match.' : 'Nothing yet. The club is new.'}
                </p>
              ) : (
                <ul className="space-y-5">
                  {past.map((event) => (
                    <EventListItem key={event._id} event={event} past />
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="hidden lg:block">
            <EventCalendar events={events} />
          </div>

        </div>
      </div>
    </section>
  )
}

export default AllEvents