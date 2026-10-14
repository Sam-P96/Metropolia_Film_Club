import { Link } from 'react-router-dom'
import { getEvents } from '../../services/events'
import useApi from '../../hooks/useApi'

function getNextEvent(allEvents) {
  const now = new Date()

  return [...allEvents]
    .filter((event) => new Date(event.startsAt) > now)
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

            <p className="leading-relaxed text-ink/70">{event.description}</p>
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