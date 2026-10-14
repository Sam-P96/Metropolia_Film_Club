import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { deleteEvent, getEvent } from '../services/events'
import useApi from '../hooks/useApi'
import { getCurrentUser } from '../utils/currentUser'
import { formatEventDate, formatEventTime } from '../utils/eventDates'
import { googleCalendarUrl } from '../utils/googleCalendar'
import { canManageEvents } from '../utils/permissions'

function EventDetail() {
  const { eventId } = useParams()
  const { data: event, loading, error } = useApi(() => getEvent(eventId), [eventId])

  const [currentUser] = useState(getCurrentUser)
  const canManage = canManageEvents(currentUser)

  // A broken gif link shouldn't leave an empty frame on the page.
  const [imageFailed, setImageFailed] = useState(false)

  if (loading) {
    return (
      <section className="px-5 py-24 text-center text-white/50 sm:px-8">
        Loading…
      </section>
    )
  }

  if (!event) {
    const notFound = error?.status === 404

    return (
      <section className="mx-auto max-w-3xl px-5 py-24 text-white sm:px-8">
        <h1 className="text-3xl font-bold">
          {notFound ? 'Event not found' : "Couldn't load this event"}
        </h1>
        <p className="mt-3 text-white/60">
          {notFound
            ? 'There is no event with that id. It may have been cancelled.'
            : 'Something went wrong on our end. Try refreshing the page.'}
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

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/club_events"
            className="text-sm text-white/50 transition-colors hover:text-white"
          >
            ← Back to club events
          </Link>

          {canManage && <ManageEvent eventId={event._id} />}
        </div>

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

// Edit and Delete, for moderators and admins. Delete asks first, right where
// the button was, so a stray click can't remove an event.
function ManageEvent({ eventId }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      await deleteEvent(eventId)
      navigate('/club_events/all', { replace: true })
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const buttonClasses =
    'rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10'

  const dangerClasses =
    'rounded-md border border-brand-red/60 px-4 py-2 text-sm font-medium text-brand-red transition-colors hover:bg-brand-red/10'

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {confirming ? (
        <>
          <span className="text-sm text-white/70">
            Delete this event? This can't be undone.
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange disabled:cursor-wait disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className={buttonClasses}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <Link to={`/club_events/${eventId}/edit`} className={buttonClasses}>
            Edit
          </Link>
          <button type="button" onClick={() => setConfirming(true)} className={dangerClasses}>
            Delete
          </button>
        </>
      )}

      {error && <p className="w-full text-right text-sm text-brand-red">{error}</p>}
    </div>
  )
}

export default EventDetail
