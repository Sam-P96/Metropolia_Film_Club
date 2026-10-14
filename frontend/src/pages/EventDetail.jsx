import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import events from '../data/events'
import { formatEventDate, formatEventTime } from '../utils/eventDates'
import { googleCalendarUrl } from '../utils/googleCalendar'

function EventDetail() {
  // The route is /club_events/:eventId. Ids in the data file are strings,
  // and so is everything useParams returns, so they compare directly.
  const { eventId } = useParams()
  const event = events.find((item) => item._id === eventId)

  // A broken gif link shouldn't leave an empty frame on the page.
  const [imageFailed, setImageFailed] = useState(false)

  if (!event) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-24 text-white sm:px-8">
        <h1 className="text-3xl font-bold">Event not found</h1>
        <p className="mt-3 text-white/60">
          There is no event with that id. It may have been cancelled.
        </p>
        <Link
          to="/club_events/all"
          className="mt-6 inline-block font-medium text-brand-gold transition-colors hover:text-white"
        >
          See all events →
        </Link>
      </section>
    )
  }

  const isPast = new Date(event.startsAt) <= new Date()
  const showImage = event.gifUrl && !imageFailed

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">

        <Link
          to="/club_events"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Back to club events
        </Link>

        <div
          className={`mt-8 grid gap-12 ${
            showImage ? 'items-start md:grid-cols-2' : ''
          }`}
        >
          <div>
            <p
              className={`text-sm font-semibold tracking-widest uppercase ${
                isPast ? 'text-white/40' : 'text-brand-gold'
              }`}
            >
              {isPast ? 'Past event' : 'Upcoming event'}
            </p>

            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{event.title}</h1>

            <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

            <dl className="space-y-4">
              <div>
                <dt className="text-xs tracking-wider text-white/40 uppercase">When</dt>
                <dd className="mt-1 font-medium">
                  {formatEventDate(event.startsAt)} at {formatEventTime(event.startsAt)}
                </dd>
              </div>

              {event.location && (
                <div>
                  <dt className="text-xs tracking-wider text-white/40 uppercase">Where</dt>
                  <dd className="mt-1 font-medium">{event.location}</dd>
                </div>
              )}

              {event.film && (
                <div>
                  <dt className="text-xs tracking-wider text-white/40 uppercase">Film</dt>
                  <dd className="mt-1 font-medium">
                    {event.film.tmdbId ? (
                      <Link
                        to={`/films/${event.film.tmdbId}`}
                        className="text-brand-gold transition-colors hover:text-white"
                      >
                        {event.film.title} →
                      </Link>
                    ) : (
                      event.film.title
                    )}
                  </dd>
                </div>
              )}
            </dl>

            {event.description && (
              <p className="mt-8 leading-relaxed whitespace-pre-line text-white/70">
                {event.description}
              </p>
            )}

            {!isPast && (
              <a
                href={googleCalendarUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="mt-10 inline-block rounded-md border border-brand-gold/60 px-4 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-brand-gold/10"
              >
                + Add to Google Calendar
              </a>
            )}
          </div>

          {showImage && (
            <div className="-skew-x-6 overflow-hidden rounded-2xl shadow-xl shadow-black/40">
              <img
                src={event.gifUrl}
                alt=""
                onError={() => setImageFailed(true)}
                className={`aspect-4/3 w-full skew-x-6 scale-115 object-cover ${
                  isPast ? 'opacity-60 grayscale' : ''
                }`}
              />
            </div>
          )}
        </div>

      </div>
    </section>
  )
}

export default EventDetail
