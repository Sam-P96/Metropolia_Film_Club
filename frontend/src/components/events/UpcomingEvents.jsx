import { useState } from 'react'
import { Link } from 'react-router-dom'

import EventCalendar from './EventCalendar'
import GifBackground from '../GifBackground'
import pinkGlowGif from '../../assets/Pink Glow GIF by xponentialdesign.gif'
import artGlowGif from '../../assets/Art Glow GIF by Lucie Mullen.gif'
import EventListItem from './EventListItem'
import { getUpcomingEvents } from '../../utils/eventDates'
import { getCurrentUser } from '../../utils/currentUser'
import { canCreateEvents, canMakeEventsOfficial } from '../../utils/permissions'
import { getEvents } from '../../services/events'
import useApi from '../../hooks/useApi'

const MAX_LISTED = 3

const createClasses =
  'rounded-md border border-brand-gold/60 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10'

// Two sections of the club events page share this. Without `screenings` it's
// "Upcoming events": official club events, plus a calendar of every event,
// and moderators can add one. With it, it's "Member screenings": only member
// screenings, no calendar, and any member can host one.
function UpcomingEvents({ screenings = false }) {
  const [currentUser] = useState(getCurrentUser)

  const { data: allEvents = [], loading, error } = useApi(getEvents, [])

  const events = allEvents.filter((event) => (screenings ? !event.official : event.official))
  const upcoming = getUpcomingEvents(events)
  const listed = upcoming.slice(0, MAX_LISTED)

  // "See all events" goes to the page with every event, so it counts every
  // upcoming one: club events and member screenings.
  const allUpcomingCount = getUpcomingEvents(allEvents).length
  const hasMore = allUpcomingCount > listed.length

  // Logged-out visitors see "Host a screening" too; it takes them to log in.
  let createButton = null

  if (screenings) {
    createButton = canCreateEvents(currentUser) ? (
      <Link to="/club_events/new" className={createClasses}>
        + Host a screening
      </Link>
    ) : (
      <Link to="/login" state={{ from: '/club_events/new' }} className={createClasses}>
        + Host a screening
      </Link>
    )
  } else if (canMakeEventsOfficial(currentUser)) {
    createButton = (
      <Link to="/club_events/new" className={createClasses}>
        + Create event
      </Link>
    )
  }

  return (
    <section className="relative overflow-hidden border-b border-white/10 text-white">
      <GifBackground src={screenings ? artGlowGif : pinkGlowGif} />
      <div className="pointer-events-none absolute inset-0 bg-black/60" />
      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">


        <div className={screenings ? '' : 'grid gap-10 lg:grid-cols-2 lg:gap-14'}>

          {/* left: the list. On a phone this IS the calendar. */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
                {screenings ? 'Member screenings' : 'Upcoming events'}
              </h2>

              {createButton}
            </div>

            <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

            {screenings && (
              <p className="-mt-4 mb-8 text-sm text-white/50">
                Screenings members are hosting themselves. Anyone with an
                account can host one.
              </p>
            )}

            {listed.length === 0 ? (
              <p className="text-white/50">
                {loading
                  ? 'Loading events…'
                  : error
                    ? "Couldn't load events. Try refreshing the page."
                    : screenings
                      ? 'Nothing coming up yet. Why not host one?'
                      : "Nothing on the calendar yet. We're working on it."}
              </p>
            ) : (
              // With no calendar beside them, screenings sit side by side.
              // Every one is a member screening, so they don't need the tag.
              <ul className={screenings ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-5'}>
                {listed.map((event) => (
                  <EventListItem key={event._id} event={event} showScreeningTag={!screenings} />
                ))}
              </ul>
            )}

            {/* Member screenings always link on: the All events page has
                every event, official or not. */}
            {(hasMore || screenings) && (
              <Link
                to="/club_events/all"
                className="mt-8 inline-block font-medium text-brand-gold transition-colors hover:text-white"
              >
                See all events{allUpcomingCount > 0 && ` (${allUpcomingCount})`} →
              </Link>
            )}
          </div>

          {/* right: the month grid, desktop only — on a phone it would just
              repeat the list above in a harder-to-read form. It shows every
              event: member screenings are outlined, club events filled. */}
          {!screenings && (
            <div className="hidden lg:block">
              <EventCalendar events={allEvents} />
            </div>
          )}

        </div>
      </div>
    </section>
  )
}

export default UpcomingEvents
