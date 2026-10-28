import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../../services/events'
import useApi from '../../hooks/useApi'

// The next official club event. Member screenings have their own section.
function getNextEvent(allEvents) {
  const now = new Date()

  return [...allEvents]
    .filter((event) => event.official && new Date(event.startsAt) > now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0]
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Helsinki',
  })
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  })
}

// The description, cut to a few lines so a long one can't stretch the
// section: it stays about as tall as the event's picture beside it. When
// it's cut short, "Read more..." opens the event page, where it's whole.
// Checked again whenever its width changes (the window resizing, say).
function EventDescription({ text, to }) {
  const ref = useRef(null)
  const [cut, setCut] = useState(false)

  useEffect(() => {
    const paragraph = ref.current
    if (!paragraph) return

    const observer = new ResizeObserver(() => {
      setCut(paragraph.scrollHeight > paragraph.clientHeight + 1)
    })
    observer.observe(paragraph)
    return () => observer.disconnect()
  }, [text])

  return (
    <>
      <p ref={ref} className="line-clamp-5 leading-relaxed text-ink/70">
        {text}
      </p>
      {cut && (
        <Link
          to={to}
          className="mt-3 inline-block font-medium text-brand-red transition-colors hover:text-brand-orange"
        >
          Read more...
        </Link>
      )}
    </>
  )
}

// showMoreLink defaults to true so the homepage keeps working untouched.
// The club events page turns it off, since it would link to itself.
function NextEvent({ showMoreLink = true }) {
  const { data: events = [], loading, error } = useApi(getEvents, [])
  const event = getNextEvent(events)

  if (!event) {
    return (
      <section className="bg-white text-ink">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="mb-2 text-sm font-semibold tracking-widest text-brand-red uppercase">
            Next Event
          </h2>
          <p className="text-ink/60">
            {loading
              ? 'Loading…'
              : error
                ? "Couldn't load events. Try refreshing the page."
                : 'No upcoming events yet. Check back soon.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white text-ink">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">

        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">

          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-widest text-brand-red uppercase">
              Next Event
            </h2>

            <h3 className="mb-6 text-3xl font-bold">
              <Link
                to={`/club_events/${event._id}`}
                className="transition-colors hover:text-brand-red"
              >
                {event.title}
              </Link>
            </h3>

            <div className="mb-6 space-y-1 text-ink/80">
              <p className="font-medium">
                {formatDate(event.startsAt)} at {formatTime(event.startsAt)}
              </p>
              <p>{event.location}</p>
              {event.film && (
                <p>
                  Film: <span className="font-semibold text-brand-red">{event.film.title}</span>
                </p>
              )}
            </div>

            <EventDescription text={event.description} to={`/club_events/${event._id}`} />
          </div>

          {event.gifUrl && (
            <div className="-skew-x-6 overflow-hidden rounded-2xl shadow-xl shadow-black/20">
              <img
                src={event.gifUrl}
                alt={event.title}
                className="aspect-4/3 w-full skew-x-6 scale-115 object-cover"
              />
            </div>
          )}

        </div>

        {showMoreLink && (
          <div className="mt-10 flex justify-end">
            <Link
              to="/club_events"
              className="font-medium text-brand-red transition-colors hover:text-brand-orange"
            >
              See more events...
            </Link>
          </div>
        )}

      </div>
    </section>
  )
}

export default NextEvent